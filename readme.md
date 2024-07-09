# Instalar RabbitMQ como servicio en docker
docker run -d -p 15672:15672 -p 5672:5672 --name rabbit rabbitmq:3-management
por defect:
user: guest
pasword: guest 