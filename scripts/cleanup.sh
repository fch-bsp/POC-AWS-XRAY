#!/bin/bash

# Configurações
PROJECT_NAME="xray-poc"
REGION="us-east-1"
PROFILE="bedhock"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🗑️  Iniciando cleanup da POC AWS X-Ray${NC}"
echo "=================================="

# Função para verificar se comando foi executado com sucesso
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: $1${NC}"
    fi
}

# Função para deletar stack
delete_stack() {
    local stack_name=$1
    local description=$2
    
    echo -e "\n${YELLOW}🗑️  Deleting ${description}...${NC}"
    
    # Verificar se a stack existe
    aws cloudformation describe-stacks --stack-name ${stack_name} --region ${REGION} --profile ${PROFILE} > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        aws cloudformation delete-stack --stack-name ${stack_name} --region ${REGION} --profile ${PROFILE}
        
        echo "Waiting for stack deletion to complete..."
        aws cloudformation wait stack-delete-complete --stack-name ${stack_name} --region ${REGION} --profile ${PROFILE}
        check_command "${description} deleted"
    else
        echo -e "${YELLOW}⚠️  Stack ${stack_name} not found, skipping...${NC}"
    fi
}

# Confirmar antes de deletar
echo -e "${RED}⚠️  WARNING: This will delete ALL resources created for the X-Ray POC!${NC}"
echo "This includes:"
echo "- ECS Cluster and Services"
echo "- RDS Database"
echo "- VPC and all networking components"
echo "- ECR repositories and images"
echo "- CloudWatch logs"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${BLUE}ℹ️  Cleanup cancelled.${NC}"
    exit 0
fi

# 1. Deletar stack de aplicação
delete_stack "${PROJECT_NAME}-application" "Application Stack"

# 2. Deletar stack de banco
delete_stack "${PROJECT_NAME}-database" "Database Stack"

# 3. Deletar stack de rede
delete_stack "${PROJECT_NAME}-network" "Network Stack"

# 4. Limpar repositórios ECR
echo -e "\n${YELLOW}📦 Cleaning up ECR repositories...${NC}"

# Obter account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile ${PROFILE})

# Deletar imagens do repositório backend
aws ecr describe-repositories --repository-names ${PROJECT_NAME}-backend --region ${REGION} --profile ${PROFILE} > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Deleting backend repository images..."
    aws ecr list-images --repository-name ${PROJECT_NAME}-backend --region ${REGION} --profile ${PROFILE} --query 'imageIds[*]' --output json > /tmp/backend-images.json
    if [ -s /tmp/backend-images.json ] && [ "$(cat /tmp/backend-images.json)" != "[]" ]; then
        aws ecr batch-delete-image --repository-name ${PROJECT_NAME}-backend --image-ids file:///tmp/backend-images.json --region ${REGION} --profile ${PROFILE}
    fi
    aws ecr delete-repository --repository-name ${PROJECT_NAME}-backend --region ${REGION} --profile ${PROFILE}
    check_command "Backend ECR repository deleted"
fi

# Deletar imagens do repositório frontend
aws ecr describe-repositories --repository-names ${PROJECT_NAME}-frontend --region ${REGION} --profile ${PROFILE} > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "Deleting frontend repository images..."
    aws ecr list-images --repository-name ${PROJECT_NAME}-frontend --region ${REGION} --profile ${PROFILE} --query 'imageIds[*]' --output json > /tmp/frontend-images.json
    if [ -s /tmp/frontend-images.json ] && [ "$(cat /tmp/frontend-images.json)" != "[]" ]; then
        aws ecr batch-delete-image --repository-name ${PROJECT_NAME}-frontend --image-ids file:///tmp/frontend-images.json --region ${REGION} --profile ${PROFILE}
    fi
    aws ecr delete-repository --repository-name ${PROJECT_NAME}-frontend --region ${REGION} --profile ${PROFILE}
    check_command "Frontend ECR repository deleted"
fi

# 5. Limpar logs do CloudWatch (opcional)
echo -e "\n${YELLOW}📊 Cleaning up CloudWatch logs...${NC}"

log_groups=(
    "/ecs/${PROJECT_NAME}-backend"
    "/ecs/${PROJECT_NAME}-frontend"
    "/ecs/${PROJECT_NAME}-xray"
)

for log_group in "${log_groups[@]}"; do
    aws logs describe-log-groups --log-group-name-prefix ${log_group} --region ${REGION} --profile ${PROFILE} > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        aws logs delete-log-group --log-group-name ${log_group} --region ${REGION} --profile ${PROFILE}
        check_command "Log group ${log_group} deleted"
    fi
done

# 6. Limpar imagens Docker locais
echo -e "\n${YELLOW}🐳 Cleaning up local Docker images...${NC}"
docker rmi ${PROJECT_NAME}-backend:latest 2>/dev/null
docker rmi ${PROJECT_NAME}-frontend:latest 2>/dev/null
docker rmi ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-backend:latest 2>/dev/null
docker rmi ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-frontend:latest 2>/dev/null
check_command "Local Docker images cleaned"

# Limpar arquivos temporários
rm -f /tmp/backend-images.json /tmp/frontend-images.json

echo -e "\n${GREEN}🎉 Cleanup completed successfully!${NC}"
echo "=================================="
echo -e "${BLUE}📋 Summary:${NC}"
echo "- All CloudFormation stacks deleted"
echo "- ECR repositories and images removed"
echo "- CloudWatch log groups deleted"
echo "- Local Docker images cleaned"
echo ""
echo -e "${GREEN}✅ All resources have been cleaned up!${NC}"
echo -e "${BLUE}💡 You can now run the deploy script again to recreate the environment.${NC}"
