# Model Training & Dataset Guide

FruitVision AI is designed with an extensible computer vision pipeline. This guide describes how to train a custom YOLO model for additional fruit classes and train a deep learning fruit quality classifier.

---

## Part 1: Training Custom Fruit Detection Models

While the base model provides native support for **Apples**, **Bananas**, and **Oranges**, extending to **Mangoes, Grapes, Pineapples, Strawberries, and Pears** requires fine-tuning.

### 1. Dataset Collection & Labeling
1. Collect 500–1,500 images per fruit category under diverse lighting and conveyor conditions.
2. Label bounding boxes in YOLO format (`class_id x_center y_center width height` normalized to [0, 1]).
3. Recommended Open-Access Datasets:
   - **Roboflow Fruit Classification & Detection Datasets**
   - **Fruit-Images-Dataset (Kaggle)**
   - **Open Images V7 (Fruit Category subset)**

### 2. Dataset Configuration (`fruits_custom.yaml`)
```yaml
path: datasets/fruits
train: images/train
val: images/val
test: images/test

names:
  0: apple
  1: banana
  2: orange
  3: mango
  4: grape
  5: pineapple
  6: strawberry
  7: pear
```

### 3. Training with Ultralytics YOLOv8
```powershell
# Activate backend environment
.\backend\venv\Scripts\Activate.ps1

# Run fine-tuning on GPU
yolo detect train `
  data=fruits_custom.yaml `
  model=yolov8n.pt `
  epochs=100 `
  imgsz=640 `
  batch=16 `
  device=0 `
  name=fruitvision_custom
```

### 4. Deploying Custom Weights
Copy `runs/detect/fruitvision_custom/weights/best.pt` to:
`d:\FRUITVISION AI\backend\models\yolov8_custom.pt`

Update `backend/.env`:
```ini
YOLO_MODEL_PATH=models/yolov8_custom.pt
```

---

## Part 2: Training a Deep Learning Quality Classifier

### 1. Data Preparation
Organize cropped fruit images into categorized subfolders:
```
dataset_quality/
  train/
    Healthy/
    Visible_Damage/
    Rotten_Spoiled/
  val/
    Healthy/
    Visible_Damage/
    Rotten_Spoiled/
```

### 2. Training with PyTorch & Torchvision
```python
import torch
import torchvision.models as models
import torchvision.transforms as transforms
from torchvision.datasets import ImageFolder
from torch.utils.data import DataLoader

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
])

train_ds = ImageFolder('dataset_quality/train', transform=transform)
train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)

model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT)
model.fc = torch.nn.Linear(model.fc.in_features, 3) # Healthy, Damaged, Rotten

criterion = torch.nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)

# Run training loop for 20 epochs...
torch.save(model, 'backend/models/quality_classifier.pt')
```

### 3. Deployment
Save to `backend/models/quality_classifier.pt`. When the backend restarts, it will automatically detect the checkpoint and transition from heuristic mode to deep learning model mode!

