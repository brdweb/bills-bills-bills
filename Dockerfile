FROM python:3.12-slim

WORKDIR /app

COPY server/requirements.txt .

RUN pip install -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "server/app.py"]
