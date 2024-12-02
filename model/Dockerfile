FROM pytorch/pytorch:latest

WORKDIR /opt/ml/code

# Copy training script
COPY train.py .

ENV PYTHONUNBUFFERED=TRUE
ENTRYPOINT ["python", "train.py"]
