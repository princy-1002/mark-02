"""
Genuine PyTorch Model Architectures for Forest-Loss Segmentation & Change Detection
"""

from __future__ import annotations
import math
from typing import Optional, Tuple, Dict, Any

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
except ImportError:
    torch = None
    nn = None
    F = None


if torch is not None:
    class DoubleConv(nn.Module):
        """(Conv2D -> BatchNorm -> ReLU) * 2"""
        def __init__(self, in_channels: int, out_channels: int):
            super().__init__()
            self.net = nn.Sequential(
                nn.Conv2d(in_channels, out_channels, kernel_size=3, padding=1, bias=False),
                nn.BatchNorm2d(out_channels),
                nn.ReLU(inplace=True),
                nn.Conv2d(out_channels, out_channels, kernel_size=3, padding=1, bias=False),
                nn.BatchNorm2d(out_channels),
                nn.ReLU(inplace=True),
            )

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            return self.net(x)

    class UNetSatellite(nn.Module):
        """
        Multi-scale U-Net for binary/multi-class satellite forest loss segmentation.
        Preserves fine canopy edges using skip connections between encoder and decoder.
        """
        def __init__(self, in_channels: int = 3, out_classes: int = 1, base_filters: int = 32):
            super().__init__()
            self.in_channels = in_channels
            self.out_classes = out_classes

            # Encoder
            self.inc = DoubleConv(in_channels, base_filters)
            self.down1 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(base_filters, base_filters * 2))
            self.down2 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(base_filters * 2, base_filters * 4))
            self.down3 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(base_filters * 4, base_filters * 8))

            # Bottleneck
            self.bottleneck = nn.Sequential(
                nn.MaxPool2d(2),
                DoubleConv(base_filters * 8, base_filters * 16)
            )

            # Decoder
            self.up1 = nn.ConvTranspose2d(base_filters * 16, base_filters * 8, kernel_size=2, stride=2)
            self.conv1 = DoubleConv(base_filters * 16, base_filters * 8)

            self.up2 = nn.ConvTranspose2d(base_filters * 8, base_filters * 4, kernel_size=2, stride=2)
            self.conv2 = DoubleConv(base_filters * 8, base_filters * 4)

            self.up3 = nn.ConvTranspose2d(base_filters * 4, base_filters * 2, kernel_size=2, stride=2)
            self.conv3 = DoubleConv(base_filters * 4, base_filters * 2)

            self.up4 = nn.ConvTranspose2d(base_filters * 2, base_filters, kernel_size=2, stride=2)
            self.conv4 = DoubleConv(base_filters * 2, base_filters)

            # Final classification head
            self.outc = nn.Conv2d(base_filters, out_classes, kernel_size=1)

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            x1 = self.inc(x)
            x2 = self.down1(x1)
            x3 = self.down2(x2)
            x4 = self.down3(x3)
            xb = self.bottleneck(x4)

            d1 = self.up1(xb)
            d1 = torch.cat([x4, d1], dim=1)
            d1 = self.conv1(d1)

            d2 = self.up2(d1)
            d2 = torch.cat([x3, d2], dim=1)
            d2 = self.conv2(d2)

            d3 = self.up3(d2)
            d3 = torch.cat([x2, d3], dim=1)
            d3 = self.conv3(d3)

            d4 = self.up4(d3)
            d4 = torch.cat([x1, d4], dim=1)
            d4 = self.conv4(d4)

            logits = self.outc(d4)
            return logits


    class LightweightForestSegNet(nn.Module):
        """
        Fast edge-deployable segmentation model with depthwise separable convolutions.
        Optimized for low-latency inference and low CPU footprint.
        """
        def __init__(self, in_channels: int = 3, out_classes: int = 1, base_filters: int = 24):
            super().__init__()
            self.stem = nn.Sequential(
                nn.Conv2d(in_channels, base_filters, kernel_size=3, padding=1, bias=False),
                nn.BatchNorm2d(base_filters),
                nn.ReLU(inplace=True),
            )

            # Downsample 1
            self.down1 = nn.Sequential(
                nn.Conv2d(base_filters, base_filters * 2, kernel_size=3, stride=2, padding=1, bias=False),
                nn.BatchNorm2d(base_filters * 2),
                nn.ReLU(inplace=True),
            )

            # Downsample 2
            self.down2 = nn.Sequential(
                nn.Conv2d(base_filters * 2, base_filters * 4, kernel_size=3, stride=2, padding=1, bias=False),
                nn.BatchNorm2d(base_filters * 4),
                nn.ReLU(inplace=True),
            )

            # Upsample 1
            self.up1 = nn.Sequential(
                nn.Upsample(scale_factor=2, mode="bilinear", align_corners=True),
                nn.Conv2d(base_filters * 4, base_filters * 2, kernel_size=3, padding=1, bias=False),
                nn.BatchNorm2d(base_filters * 2),
                nn.ReLU(inplace=True),
            )

            # Upsample 2
            self.up2 = nn.Sequential(
                nn.Upsample(scale_factor=2, mode="bilinear", align_corners=True),
                nn.Conv2d(base_filters * 2, base_filters, kernel_size=3, padding=1, bias=False),
                nn.BatchNorm2d(base_filters),
                nn.ReLU(inplace=True),
            )

            self.head = nn.Conv2d(base_filters, out_classes, kernel_size=1)

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            x0 = self.stem(x)
            x1 = self.down1(x0)
            x2 = self.down2(x1)
            u1 = self.up1(x2) + x1
            u2 = self.up2(u1) + x0
            return self.head(u2)


    class DiceLoss(nn.Module):
        """Soft Dice Loss for segmenting unbalanced satellite canopy deforestation."""
        def __init__(self, smooth: float = 1e-5):
            super().__init__()
            self.smooth = smooth

        def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
            probs = torch.sigmoid(logits)
            probs = probs.view(-1)
            targets = targets.view(-1)
            intersection = (probs * targets).sum()
            dice = (2.0 * intersection + self.smooth) / (probs.sum() + targets.sum() + self.smooth)
            return 1.0 - dice


    class CombinedBCEDiceLoss(nn.Module):
        """Joint BCE and Dice Loss for robust satellite segmentation."""
        def __init__(self, bce_weight: float = 0.5, dice_weight: float = 0.5):
            super().__init__()
            self.bce = nn.BCEWithLogitsLoss()
            self.dice = DiceLoss()
            self.bce_weight = bce_weight
            self.dice_weight = dice_weight

        def forward(self, logits: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
            loss_bce = self.bce(logits, targets)
            loss_dice = self.dice(logits, targets)
            return self.bce_weight * loss_bce + self.dice_weight * loss_dice


def create_model_instance(architecture_id: str, in_channels: int = 3, out_classes: int = 1):
    """Instantiates a genuine PyTorch model based on chosen architecture."""
    if torch is None:
        raise RuntimeError("PyTorch is not installed or available on this system.")

    if architecture_id == "unet_satellite_v1":
        return UNetSatellite(in_channels=in_channels, out_classes=out_classes, base_filters=32)
    elif architecture_id == "forest_segnet_light":
        return LightweightForestSegNet(in_channels=in_channels, out_classes=out_classes, base_filters=24)
    else:
        raise ValueError(f"Unknown or unsupported architecture: '{architecture_id}'.")


def get_loss_function(name: str):
    """Returns loss function instance."""
    if torch is None:
        raise RuntimeError("PyTorch is not available.")

    if name == "Combined_BCE_Dice":
        return CombinedBCEDiceLoss(0.5, 0.5)
    elif name == "BCE":
        return nn.BCEWithLogitsLoss()
    elif name == "Dice":
        return DiceLoss()
    return CombinedBCEDiceLoss(0.5, 0.5)
