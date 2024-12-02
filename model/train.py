import os
import json
import torch

def train():
    print("Training started")
    # Sample training code
    model = torch.nn.Linear(10, 2)
    print("Model created")
    
    # Save model
    save_path = os.path.join('/opt/ml/model', 'model.pth')
    torch.save(model.state_dict(), save_path)
    print(f"Model saved to {save_path}")

if __name__ == '__main__':
    train()
