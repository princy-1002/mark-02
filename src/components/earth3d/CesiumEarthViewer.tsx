import React, { useEffect, useRef, useState } from 'react';
import { 
  Viewer, 
  Cartesian3, 
  Color, 
  GeoJsonDataSource, 
  ScreenSpaceEventHandler, 
  ScreenSpaceEventType, 
  Math as CesiumMath, 
  Ion, 
  ArcGisMapServerImageryProvider, 
  OpenStreetMapImageryProvider, 
  createWorldTerrainAsync, 
  EllipsoidTerrainProvider, 
  defined,
  Entity,
  VerticalOrigin,
  HorizontalOrigin,
  NearFarScalar,
  LabelStyle,
  Cartesian2,
  ImageryLayer
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { 
  DEMO_FOREST_COVER_GEOJSON, 
  DEMO_FOREST_LOSS_GEOJSON,
  DEMO_ADMIN_BOUNDARIES_GEOJSON
} from '../../data/geoJsonData';
import type {
  CameraPreset,
  ForestLossGeoJsonProperties,
  ForestCoverGeoJsonProperties
} from '../../data/geoJsonData';
import { LoadingState, ErrorState } from '../common/StateViews';
import type { DateRangeOption } from '../../types/monitoring';
import { isDateInFilterRange, isAreaInFilterRange, isSeverityMatch } from '../../types/layersAndFilters';

interface CesiumEarthViewerProps {
  showForestCover?: boolean;
  showForestLoss?: boolean;
  showHotspotPins?: boolean;
  showBoundaries?: boolean;
  showBaseSatellite?: boolean;
  selectedSeverity?: string;
  minAreaHa?: number | null;
  maxAreaHa?: number | null;
  dateRange?: string;
  startDate?: string | null;
  endDate?: string | null;
  activePreset: CameraPreset;
  isAutoRotating: boolean;
  onSelectLossRegion: (props: ForestLossGeoJsonProperties | null) => void;
  onSelectCoverRegion: (props: ForestCoverGeoJsonProperties | null) => void;
  onViewerReady?: (viewer: Viewer) => void;
  /** Optional GeoJSON FeatureCollection from ML inference to overlay as real detection polygons */
  mlGeoJson?: Record<string, any> | null;
  showMLDetections?: boolean;
}

export const CesiumEarthViewer: React.FC<CesiumEarthViewerProps> = ({
  showForestCover = true,
  showForestLoss = true,
  showHotspotPins = true,
  showBoundaries = true,
  showBaseSatellite = true,
  selectedSeverity = 'all',
  minAreaHa = null,
  maxAreaHa = null,
  dateRange = '30d',
  startDate = null,
  endDate = null,
  activePreset,
  isAutoRotating,
  onSelectLossRegion,
  onSelectCoverRegion,
  onViewerReady,
  mlGeoJson = null,
  showMLDetections = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const baseImageryLayerRef = useRef<ImageryLayer | null>(null);
  const coverDataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const lossDataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const pinsDataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const boundariesDataSourceRef = useRef<GeoJsonDataSource | null>(null);
  const mlDataSourceRef = useRef<GeoJsonDataSource | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [imagerySourceNotice, setImagerySourceNotice] = useState<string>("Permitted Open Geospatial Satellite Imagery");

  // Initialize Cesium Viewer once
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    let isMounted = true;
    let viewer: Viewer | null = null;
    let handler: ScreenSpaceEventHandler | null = null;

    const initCesium = async () => {
      try {
        setIsLoading(true);

        // Check for Cesium Ion Token from environment
        const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
        if (ionToken) {
          Ion.defaultAccessToken = ionToken;
        }

        // Configure permitted, high-performance base imagery provider
        let baseImageryProvider: any;
        try {
          // Primary permitted source: ArcGIS World Imagery MapServer (Global 15m/sub-meter)
          baseImageryProvider = await ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
            { enablePickFeatures: false }
          );
          if (isMounted) setImagerySourceNotice("Esri World Imagery (Permitted Satellite Baseline)");
        } catch (imageryErr) {
          console.warn("ArcGIS Imagery unavailable, falling back to OpenStreetMap / Default:", imageryErr);
          baseImageryProvider = new OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/'
          });
          if (isMounted) setImagerySourceNotice("OpenStreetMap Tile Imagery (Fallback)");
        }

        // Optional terrain provider (world terrain if Ion token available, else Ellipsoid)
        let terrainProvider: any = new EllipsoidTerrainProvider();
        if (ionToken) {
          try {
            terrainProvider = await createWorldTerrainAsync({
              requestWaterMask: true,
              requestVertexNormals: true
            });
          } catch (terrainErr) {
            console.warn("Ion terrain unavailable, using Ellipsoid:", terrainErr);
            terrainProvider = new EllipsoidTerrainProvider();
          }
        }

        if (!isMounted || !containerRef.current) return;

        // Initialize Cesium Viewer
        viewer = new Viewer(containerRef.current, {
          baseLayer: baseImageryProvider ? ImageryLayer.fromProviderAsync(Promise.resolve(baseImageryProvider)) : undefined,
          terrainProvider: terrainProvider,
          animation: false,
          timeline: false,
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          fullscreenButton: false,
          sceneModePicker: false,
          shouldAnimate: true
        });

        viewerRef.current = viewer;

        // Configure scene atmospheric styling
        const scene = viewer.scene;
        scene.globe.enableLighting = false;
        scene.globe.depthTestAgainstTerrain = false;

        // Hide default credit container from obstructing custom analyst HUD
        const creditContainer = viewer.bottomContainer;
        if (creditContainer) {
          (creditContainer as HTMLElement).style.display = 'none';
        }

        // Focus Initial Camera on India (National Extent)
        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(80.0, 21.5, 3800000),
          orientation: {
            heading: CesiumMath.toRadians(0),
            pitch: CesiumMath.toRadians(-80),
            roll: 0.0
          }
        });

        // 1. Load Forest Cover GeoJSON
        const coverSource = await GeoJsonDataSource.load(DEMO_FOREST_COVER_GEOJSON, {
          stroke: Color.fromCssColorString('#10b981').withAlpha(0.85),
          fill: Color.fromCssColorString('#10b981').withAlpha(0.25),
          strokeWidth: 2
        });

        // Style forest cover entities
        coverSource.entities.values.forEach((entity: Entity) => {
          if (entity.polygon) {
            entity.polygon.material = Color.fromCssColorString('#10b981').withAlpha(0.25) as any;
            entity.polygon.outline = true as any;
            entity.polygon.outlineColor = Color.fromCssColorString('#10b981').withAlpha(0.85) as any;
          }
        });

        viewer.dataSources.add(coverSource);
        coverDataSourceRef.current = coverSource;

        // 2. Load Forest Loss GeoJSON with Severity Colors
        const lossSource = await GeoJsonDataSource.load(DEMO_FOREST_LOSS_GEOJSON, {
          strokeWidth: 3
        });

        lossSource.entities.values.forEach((entity: Entity) => {
          const currentTime = viewer?.clock.currentTime;
          const props = currentTime ? entity.properties?.getValue(currentTime) : undefined;
          const severity = props?.severity || 'critical';

          let fillColor = Color.fromCssColorString('#ef4444').withAlpha(0.65);
          let strokeColor = Color.fromCssColorString('#ef4444');

          if (severity === 'high') {
            fillColor = Color.fromCssColorString('#f97316').withAlpha(0.65);
            strokeColor = Color.fromCssColorString('#f97316');
          } else if (severity === 'moderate') {
            fillColor = Color.fromCssColorString('#eab308').withAlpha(0.65);
            strokeColor = Color.fromCssColorString('#eab308');
          } else if (severity === 'low') {
            fillColor = Color.fromCssColorString('#10b981').withAlpha(0.65);
            strokeColor = Color.fromCssColorString('#10b981');
          }

          if (entity.polygon) {
            entity.polygon.material = fillColor as any;
            entity.polygon.outline = true as any;
            entity.polygon.outlineColor = strokeColor as any;
            // Float polygons slightly above terrain to prevent z-fighting
            entity.polygon.height = 100 as any;
          }
        });

        viewer.dataSources.add(lossSource);
        lossDataSourceRef.current = lossSource;

        // 3. Add Hotspot Pins for Quick Visual Detection
        const pinsSource = new GeoJsonDataSource("PinsDataSource");
        DEMO_FOREST_LOSS_GEOJSON.features.forEach((feat) => {
          const coords = feat.geometry.coordinates[0][0]; // Longitude, Latitude
          const isCritical = feat.properties.severity === 'critical';
          const pinColor = isCritical ? Color.RED : Color.ORANGE;

          pinsSource.entities.add({
            position: Cartesian3.fromDegrees(coords[0], coords[1], 250),
            properties: feat.properties as any,
            point: {
              pixelSize: isCritical ? 10 : 8,
              color: pinColor,
              outlineColor: Color.WHITE,
              outlineWidth: 2,
              scaleByDistance: new NearFarScalar(1.5e2, 1.2, 8.0e6, 0.4)
            },
            label: {
              text: `${feat.properties.id}\n${feat.properties.areaHectares} ha`,
              font: '10px JetBrains Mono, monospace',
              fillColor: Color.WHITE,
              outlineColor: Color.BLACK,
              outlineWidth: 2,
              style: LabelStyle.FILL_AND_OUTLINE,
              verticalOrigin: VerticalOrigin.BOTTOM,
              horizontalOrigin: HorizontalOrigin.CENTER,
              pixelOffset: new Cartesian2(0, -12),
              scaleByDistance: new NearFarScalar(1.0e3, 1.0, 2.5e6, 0.0)
            }
          });
        });

        viewer.dataSources.add(pinsSource);
        pinsDataSourceRef.current = pinsSource;

        // 4. Load Administrative & Reserve Boundaries GeoJSON
        const boundariesSource = await GeoJsonDataSource.load(DEMO_ADMIN_BOUNDARIES_GEOJSON, {
          stroke: Color.fromCssColorString('#38bdf8'),
          strokeWidth: 2
        });

        boundariesSource.entities.values.forEach((entity: Entity) => {
          if (entity.polyline) {
            entity.polyline.material = Color.fromCssColorString('#38bdf8').withAlpha(0.85) as any;
            entity.polyline.width = 2.5 as any;
          }
        });

        viewer.dataSources.add(boundariesSource);
        boundariesDataSourceRef.current = boundariesSource;
        boundariesSource.show = showBoundaries;

        if (viewer.imageryLayers.length > 0) {
          baseImageryLayerRef.current = viewer.imageryLayers.get(0);
          baseImageryLayerRef.current.show = showBaseSatellite;
        }

        // 4. Setup Interactive Click / Pick Handler
        handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((movement: { position: any }) => {
          if (!viewer) return;
          const pickedObject = viewer.scene.pick(movement.position);

          if (defined(pickedObject) && pickedObject.id instanceof Entity) {
            const entity = pickedObject.id;
            const props = entity.properties?.getValue(viewer.clock.currentTime);

            if (props && props.areaHectares !== undefined) {
              // Forest loss anomaly picked
              onSelectCoverRegion(null);
              onSelectLossRegion(props as ForestLossGeoJsonProperties);
            } else if (props && props.biome !== undefined) {
              // Forest cover extent picked
              onSelectLossRegion(null);
              onSelectCoverRegion(props as ForestCoverGeoJsonProperties);
            }
          }
        }, ScreenSpaceEventType.LEFT_CLICK);

        if (onViewerReady) {
          onViewerReady(viewer);
        }

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Error initializing Cesium Earth:", err);
        if (isMounted) {
          setInitError(err?.message || "Failed to initialize WebGL 3D Earth canvas");
          setIsLoading(false);
        }
      }
    };

    initCesium();

    return () => {
      isMounted = false;
      if (handler) {
        handler.destroy();
      }
      if (viewer && !viewer.isDestroyed()) {
        try {
          viewer.destroy();
        } catch (e) {
          console.warn("Cesium destruction notice:", e);
        }
      }
      viewerRef.current = null;
    };
  }, []);

  // Update layer visibility
  useEffect(() => {
    if (coverDataSourceRef.current) {
      coverDataSourceRef.current.show = showForestCover;
    }
  }, [showForestCover]);

  useEffect(() => {
    if (lossDataSourceRef.current) {
      lossDataSourceRef.current.show = showForestLoss;
    }
  }, [showForestLoss]);

  useEffect(() => {
    if (pinsDataSourceRef.current) {
      pinsDataSourceRef.current.show = showHotspotPins;
    }
  }, [showHotspotPins]);

  useEffect(() => {
    if (boundariesDataSourceRef.current) {
      boundariesDataSourceRef.current.show = showBoundaries;
    }
  }, [showBoundaries]);

  useEffect(() => {
    if (baseImageryLayerRef.current) {
      baseImageryLayerRef.current.show = showBaseSatellite;
    }
  }, [showBaseSatellite]);

  // Synchronize entity visibility with dynamic filters without recreating Cesium viewer
  useEffect(() => {
    if (!lossDataSourceRef.current || !pinsDataSourceRef.current) return;

    const viewer = viewerRef.current;
    const currentTime = viewer?.clock.currentTime;

    const filterEntity = (entity: Entity) => {
      const props = currentTime ? entity.properties?.getValue(currentTime) : undefined;
      if (!props) return true;

      // Severity filter
      if (!isSeverityMatch(props.severity, selectedSeverity)) return false;

      // Minimum & maximum area filter
      if (!isAreaInFilterRange(props.areaHectares, minAreaHa, maxAreaHa)) return false;

      // Date range filter
      if (!isDateInFilterRange(props.detectedDate, dateRange as DateRangeOption, startDate, endDate)) {
        return false;
      }

      return true;
    };

    lossDataSourceRef.current.entities.values.forEach(entity => {
      entity.show = filterEntity(entity);
    });

    pinsDataSourceRef.current.entities.values.forEach(entity => {
      entity.show = filterEntity(entity);
    });
  }, [selectedSeverity, minAreaHa, maxAreaHa, dateRange, startDate, endDate]);

  // Load / refresh ML inference GeoJSON polygons when mlGeoJson prop changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    // Remove previous ML layer
    if (mlDataSourceRef.current) {
      viewer.dataSources.remove(mlDataSourceRef.current, true);
      mlDataSourceRef.current = null;
    }

    if (!mlGeoJson || !showMLDetections) return;

    const loadMLLayer = async () => {
      try {
        const mlSource = await GeoJsonDataSource.load(mlGeoJson as any, { strokeWidth: 2.5 });

        mlSource.entities.values.forEach((entity: Entity) => {
          const currentTime = viewer?.clock.currentTime;
          const props = currentTime ? entity.properties?.getValue(currentTime) : undefined;
          const severity = props?.severity || 'critical';

          let fillColor = Color.fromCssColorString('#ef4444').withAlpha(0.72); // Critical: Red
          let strokeColor = Color.fromCssColorString('#ef4444');

          if (severity === 'high') {
            fillColor = Color.fromCssColorString('#f97316').withAlpha(0.72);
            strokeColor = Color.fromCssColorString('#f97316');
          } else if (severity === 'moderate') {
            fillColor = Color.fromCssColorString('#eab308').withAlpha(0.72);
            strokeColor = Color.fromCssColorString('#eab308');
          }

          if (entity.polygon) {
            entity.polygon.material = fillColor as any;
            entity.polygon.outline = true as any;
            entity.polygon.outlineColor = strokeColor as any;
            entity.polygon.height = 150 as any; // slightly higher z than demo layer
          }
        });

        if (!viewer.isDestroyed()) {
          viewer.dataSources.add(mlSource);
          mlDataSourceRef.current = mlSource;
        }
      } catch (err) {
        console.warn('Failed to load ML GeoJSON overlay into Cesium:', err);
      }
    };

    loadMLLayer();
  }, [mlGeoJson, showMLDetections]);

  // Toggle ML layer show/hide
  useEffect(() => {
    if (mlDataSourceRef.current) {
      mlDataSourceRef.current.show = showMLDetections ?? true;
    }
  }, [showMLDetections]);

  // Camera fly-to when active preset changes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !activePreset) return;

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        activePreset.lng,
        activePreset.lat,
        activePreset.height
      ),
      orientation: {
        heading: CesiumMath.toRadians(activePreset.headingDeg),
        pitch: CesiumMath.toRadians(activePreset.pitchDeg),
        roll: 0.0
      },
      duration: 2.2
    });
  }, [activePreset]);

  // Gentle planetary auto-rotation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;

    let removeListener: (() => void) | null = null;

    if (isAutoRotating) {
      const onTick = () => {
        if (!viewer || viewer.isDestroyed()) return;
        viewer.scene.camera.rotate(Cartesian3.UNIT_Z, -0.0008);
      };
      viewer.clock.onTick.addEventListener(onTick);
      removeListener = () => viewer.clock.onTick.removeEventListener(onTick);
    }

    return () => {
      if (removeListener) removeListener();
    };
  }, [isAutoRotating]);

  return (
    <div className="relative w-full h-full min-h-[580px] bg-[#050807] overflow-hidden select-none">
      {/* Cesium WebGL Container */}
      <div 
        ref={containerRef} 
        id="cesium-container" 
        className="w-full h-full absolute inset-0"
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-40 bg-[#070b09]/90 backdrop-blur-md flex items-center justify-center p-6">
          <LoadingState
            message="Initializing CesiumJS 3D Earth Globe..."
            subMessage="Streaming permitted satellite base layer and compiling WGS-84 canopy GeoJSON overlays"
          />
        </div>
      )}

      {/* Error View */}
      {initError && (
        <div className="absolute inset-0 z-40 bg-[#090d0b]/95 flex items-center justify-center p-6">
          <ErrorState
            title="3D Geospatial Engine Initialization Failed"
            message={`Cesium WebGL canvas encountered an error: ${initError}. Please verify WebGL support or configure VITE_CESIUM_ION_TOKEN.`}
          />
        </div>
      )}

      {/* Bottom Telemetry HUD */}
      {!isLoading && !initError && (
        <div className="absolute bottom-3 left-4 z-20 pointer-events-none bg-[#090f0c]/85 backdrop-blur-md border border-[#1b2b21] rounded-lg px-3 py-1.5 text-[10px] font-mono text-slate-400 flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            CESIUM 3D READY
          </span>
          <span>•</span>
          <span className="text-slate-300">{imagerySourceNotice}</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">Coordinate Reference: WGS-84 / EPSG:4326</span>
        </div>
      )}
    </div>
  );
};
