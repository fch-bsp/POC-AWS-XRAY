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

echo -e "${BLUE}🚀 Iniciando deploy da POC AWS X-Ray${NC}"
echo "=================================="

# Função para verificar se comando foi executado com sucesso
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ Erro: $1${NC}"
        exit 1
    fi
}

# 1. Deploy da stack de rede
echo -e "\n${YELLOW}📡 Deploying Network Stack...${NC}"
aws cloudformation deploy \
    --template-file cloudformation/01-network-stack.yaml \
    --stack-name ${PROJECT_NAME}-network \
    --parameter-overrides ProjectName=${PROJECT_NAME} \
    --region ${REGION} \
    --profile ${PROFILE} \
    --no-fail-on-empty-changeset

check_command "Network stack deployed"

# 2. Deploy da stack de banco
echo -e "\n${YELLOW}🗄️  Deploying Database Stack...${NC}"
aws cloudformation deploy \
    --template-file cloudformation/02-database-stack.yaml \
    --stack-name ${PROJECT_NAME}-database \
    --parameter-overrides \
        ProjectName=${PROJECT_NAME} \
        NetworkStackName=${PROJECT_NAME}-network \
    --region ${REGION} \
    --profile ${PROFILE} \
    --no-fail-on-empty-changeset

check_command "Database stack deployed"

# 3. Obter informações dos repositórios ECR
echo -e "\n${YELLOW}📦 Getting ECR repository information...${NC}"

# Criar repositórios ECR se não existirem
aws ecr describe-repositories --repository-names ${PROJECT_NAME}-backend --region ${REGION} --profile ${PROFILE} > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Creating backend ECR repository..."
    aws ecr create-repository --repository-name ${PROJECT_NAME}-backend --region ${REGION} --profile ${PROFILE}
fi

aws ecr describe-repositories --repository-names ${PROJECT_NAME}-frontend --region ${REGION} --profile ${PROFILE} > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Creating frontend ECR repository..."
    aws ecr create-repository --repository-name ${PROJECT_NAME}-frontend --region ${REGION} --profile ${PROFILE}
fi

# Obter account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile ${PROFILE})
BACKEND_REPO_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-backend"
FRONTEND_REPO_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}-frontend"

echo "Backend Repository: ${BACKEND_REPO_URI}"
echo "Frontend Repository: ${FRONTEND_REPO_URI}"

# 4. Login no ECR
echo -e "\n${YELLOW}🔐 Logging into ECR...${NC}"
aws ecr get-login-password --region ${REGION} --profile ${PROFILE} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
check_command "ECR login successful"

# 5. Build e push da imagem do backend
echo -e "\n${YELLOW}🏗️  Building and pushing backend image...${NC}"
cd backend
docker build -t ${PROJECT_NAME}-backend .
check_command "Backend image built"

docker tag ${PROJECT_NAME}-backend:latest ${BACKEND_REPO_URI}:latest
docker push ${BACKEND_REPO_URI}:latest
check_command "Backend image pushed to ECR"
cd ..

# 6. Build e push da imagem do frontend
echo -e "\n${YELLOW}🏗️  Building and pushing frontend image...${NC}"
cd frontend
docker build -t ${PROJECT_NAME}-frontend .
check_command "Frontend image built"

docker tag ${PROJECT_NAME}-frontend:latest ${FRONTEND_REPO_URI}:latest
docker push ${FRONTEND_REPO_URI}:latest
check_command "Frontend image pushed to ECR"
cd ..

# 7. Deploy da stack de aplicação
echo -e "\n${YELLOW}🚀 Deploying Application Stack...${NC}"
aws cloudformation deploy \
    --template-file cloudformation/03-application-stack.yaml \
    --stack-name ${PROJECT_NAME}-application \
    --parameter-overrides \
        ProjectName=${PROJECT_NAME} \
        NetworkStackName=${PROJECT_NAME}-network \
        DatabaseStackName=${PROJECT_NAME}-database \
        BackendImageURI=${BACKEND_REPO_URI}:latest \
        FrontendImageURI=${FRONTEND_REPO_URI}:latest \
    --capabilities CAPABILITY_IAM \
    --region ${REGION} \
    --profile ${PROFILE} \
    --no-fail-on-empty-changeset

check_command "Application stack deployed"

# 8. Obter URL da aplicação
echo -e "\n${GREEN}🎉 Deploy completed successfully!${NC}"
echo "=================================="

ALB_DNS=$(aws cloudformation describe-stacks \
    --stack-name ${PROJECT_NAME}-application \
    --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
    --output text \
    --region ${REGION} \
    --profile ${PROFILE})

echo -e "\n${BLUE}📋 Application Information:${NC}"
echo "Application URL: http://${ALB_DNS}"
echo "X-Ray Console: https://console.aws.amazon.com/xray/home?region=${REGION}#/traces"
echo ""
echo -e "${YELLOW}⏳ Note: It may take a few minutes for the application to be fully available.${NC}"
echo -e "${YELLOW}🔍 Check the ECS services status in the AWS Console.${NC}"

echo -e "\n${GREEN}✅ All stacks deployed successfully!${NC}"
