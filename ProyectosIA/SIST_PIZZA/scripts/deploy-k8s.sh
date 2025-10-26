#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="sist-pizza"
CONTEXT="${KUBE_CONTEXT:-docker-desktop}"
BACKEND_IMAGE="${DOCKER_REGISTRY}/sist-pizza-backend:${VERSION:-latest}"
FRONTEND_IMAGE="${DOCKER_REGISTRY}/sist-pizza-frontend:${VERSION:-latest}"

echo -e "${BLUE}🍕 SIST Pizza Kubernetes Deployment${NC}"
echo -e "${BLUE}================================${NC}"
echo "Namespace: $NAMESPACE"
echo "Context: $CONTEXT"
echo "Backend: $BACKEND_IMAGE"
echo "Frontend: $FRONTEND_IMAGE"
echo ""

# Validate kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found${NC}"
    exit 1
fi

# Set context
echo -e "${YELLOW}Setting Kubernetes context...${NC}"
kubectl config use-context "$CONTEXT" || true

# Create namespace
echo -e "${YELLOW}Creating namespace...${NC}"
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Create secrets
echo -e "${YELLOW}Creating secrets...${NC}"
kubectl create secret generic sist-pizza-secrets \
  --from-literal=DB_PASSWORD="${DB_PASSWORD:-postgres}" \
  --from-literal=SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY}" \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}" \
  --from-literal=CLAUDE_API_KEY="${CLAUDE_API_KEY}" \
  --from-literal=MODO_API_KEY="${MODO_API_KEY}" \
  --from-literal=CHATWOOT_API_KEY="${CHATWOOT_API_KEY}" \
  -n "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Apply manifests
echo -e "${YELLOW}Applying Kubernetes manifests...${NC}"
kubectl apply -f k8s/database.yml
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/hpa.yml
kubectl apply -f k8s/ingress.yml
kubectl apply -f k8s/network-policies.yml

# Update images
echo -e "${YELLOW}Updating container images...${NC}"
kubectl set image deployment/backend \
  backend="$BACKEND_IMAGE" \
  -n "$NAMESPACE" || true

kubectl set image deployment/frontend \
  frontend="$FRONTEND_IMAGE" \
  -n "$NAMESPACE" || true

# Wait for rollout
echo -e "${YELLOW}Waiting for backend rollout...${NC}"
kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=5m

echo -e "${YELLOW}Waiting for frontend rollout...${NC}"
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=5m

# Get service endpoints
echo -e "${YELLOW}Getting service endpoints...${NC}"
echo ""
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo "Frontend:"
kubectl get service frontend-svc -n "$NAMESPACE" -o wide

echo ""
echo "Backend:"
kubectl get service backend-svc -n "$NAMESPACE" -o wide

echo ""
echo "Database:"
kubectl get service postgres-svc -n "$NAMESPACE" -o wide

echo ""
echo -e "${BLUE}Useful commands:${NC}"
echo "kubectl port-forward -n $NAMESPACE svc/frontend-svc 3000:80 &"
echo "kubectl port-forward -n $NAMESPACE svc/backend-svc 3001:3000 &"
echo "kubectl logs -n $NAMESPACE -l app=backend --tail=100 -f"
echo "kubectl describe pod -n $NAMESPACE <pod-name>"
echo "kubectl delete namespace $NAMESPACE  # To cleanup"
