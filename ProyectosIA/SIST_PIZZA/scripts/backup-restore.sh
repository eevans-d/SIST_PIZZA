#!/bin/bash
set -e

# Backup and Disaster Recovery script
# Usage: ./backup-restore.sh backup|restore [backup-file]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="${BACKUP_DIR:-./backups}"
NAMESPACE="${NAMESPACE:-sist-pizza}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/sist-pizza-backup-${TIMESTAMP}.tar.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Validate kubectl
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}❌ kubectl not found${NC}"
    exit 1
fi

function backup() {
    echo -e "${BLUE}🍕 Starting SIST Pizza Backup${NC}"
    echo -e "${BLUE}==============================${NC}"
    echo "Backup file: $BACKUP_FILE"
    echo ""

    # Backup PostgreSQL data
    echo -e "${YELLOW}📦 Backing up PostgreSQL...${NC}"
    TEMP_DIR=$(mktemp -d)
    
    POD=$(kubectl get pod -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')
    if [ -z "$POD" ]; then
        echo -e "${RED}❌ PostgreSQL pod not found${NC}"
        exit 1
    fi

    # Dump database
    kubectl exec -n "$NAMESPACE" "$POD" -- \
        pg_dump -U postgres sist_pizza > "$TEMP_DIR/sist_pizza.sql"
    
    # Backup K8s manifests
    echo -e "${YELLOW}📦 Backing up Kubernetes configs...${NC}"
    kubectl get all -n "$NAMESPACE" -o yaml > "$TEMP_DIR/k8s-resources.yaml"
    kubectl get configmap -n "$NAMESPACE" -o yaml > "$TEMP_DIR/configmaps.yaml"
    kubectl get secrets -n "$NAMESPACE" -o yaml > "$TEMP_DIR/secrets.yaml"
    kubectl get pvc -n "$NAMESPACE" -o yaml > "$TEMP_DIR/pvcs.yaml"

    # Backup application code (if needed)
    echo -e "${YELLOW}📦 Creating backup archive...${NC}"
    tar -czf "$BACKUP_FILE" \
        -C "$TEMP_DIR" . \
        2>/dev/null || true

    # Calculate size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    # Cleanup
    rm -rf "$TEMP_DIR"

    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
    echo "File: $BACKUP_FILE"
    echo "Size: $SIZE"
    echo ""
    
    # Verify backup
    if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backup integrity verified${NC}"
    else
        echo -e "${RED}❌ Backup verification failed${NC}"
        exit 1
    fi

    # List recent backups
    echo ""
    echo -e "${BLUE}Recent backups:${NC}"
    ls -lh "$BACKUP_DIR"/sist-pizza-backup-*.tar.gz 2>/dev/null | tail -5
}

function restore() {
    RESTORE_FILE="${1:-}"
    
    if [ -z "$RESTORE_FILE" ]; then
        echo -e "${RED}❌ No backup file specified${NC}"
        echo "Usage: $0 restore <backup-file>"
        exit 1
    fi

    if [ ! -f "$RESTORE_FILE" ]; then
        echo -e "${RED}❌ Backup file not found: $RESTORE_FILE${NC}"
        exit 1
    fi

    echo -e "${BLUE}🍕 Starting SIST Pizza Restore${NC}"
    echo -e "${BLUE}=============================  ${NC}"
    echo "Restore file: $RESTORE_FILE"
    echo ""

    echo -e "${YELLOW}⚠️  WARNING: This will restore the entire system!${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Restore cancelled"
        exit 0
    fi

    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT

    # Extract backup
    echo -e "${YELLOW}📦 Extracting backup archive...${NC}"
    tar -xzf "$RESTORE_FILE" -C "$TEMP_DIR"

    # Restore PostgreSQL
    echo -e "${YELLOW}📦 Restoring PostgreSQL...${NC}"
    POD=$(kubectl get pod -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD" ]; then
        echo -e "${YELLOW}Creating PostgreSQL pod...${NC}"
        kubectl apply -f k8s/database.yml
        # Wait for pod
        kubectl wait --for=condition=ready pod \
            -l app=postgres \
            -n "$NAMESPACE" \
            --timeout=300s || true
        POD=$(kubectl get pod -n "$NAMESPACE" -l app=postgres -o jsonpath='{.items[0].metadata.name}')
    fi

    # Restore SQL dump
    kubectl exec -i -n "$NAMESPACE" "$POD" -- \
        psql -U postgres < "$TEMP_DIR/sist_pizza.sql" || true

    # Restore K8s resources
    echo -e "${YELLOW}📦 Restoring Kubernetes resources...${NC}"
    kubectl apply -f "$TEMP_DIR/k8s-resources.yaml" || true
    kubectl apply -f "$TEMP_DIR/configmaps.yaml" || true
    kubectl apply -f "$TEMP_DIR/pvcs.yaml" || true

    echo -e "${GREEN}✅ Restore completed!${NC}"
    echo ""
    echo -e "${YELLOW}Waiting for pods to be ready...${NC}"
    kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=5m || true
    kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=5m || true

    echo -e "${GREEN}✅ System restored successfully!${NC}"
}

function list_backups() {
    echo -e "${BLUE}Available backups:${NC}"
    if [ -d "$BACKUP_DIR" ]; then
        ls -lh "$BACKUP_DIR"/sist-pizza-backup-*.tar.gz 2>/dev/null || echo "No backups found"
    else
        echo "Backup directory not found: $BACKUP_DIR"
    fi
}

function health_check() {
    echo -e "${BLUE}🍕 Performing Health Check${NC}"
    echo -e "${BLUE}===========================${NC}"
    echo ""

    # Check namespace
    echo -e "${YELLOW}Checking namespace...${NC}"
    kubectl get namespace "$NAMESPACE" || { echo -e "${RED}❌ Namespace not found${NC}"; exit 1; }
    echo -e "${GREEN}✅ Namespace exists${NC}"
    echo ""

    # Check deployments
    echo -e "${YELLOW}Checking deployments...${NC}"
    kubectl get deployment -n "$NAMESPACE"
    echo ""

    # Check pods
    echo -e "${YELLOW}Checking pods...${NC}"
    READY_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Running --no-headers | wc -l)
    TOTAL_PODS=$(kubectl get pods -n "$NAMESPACE" --no-headers | wc -l)
    echo "Running pods: $READY_PODS / $TOTAL_PODS"
    echo ""

    if [ "$READY_PODS" -eq "$TOTAL_PODS" ]; then
        echo -e "${GREEN}✅ All pods are running${NC}"
    else
        echo -e "${YELLOW}⚠️  Some pods are not ready${NC}"
        kubectl get pods -n "$NAMESPACE" -o wide
    fi

    # Check services
    echo -e "${YELLOW}Services:${NC}"
    kubectl get svc -n "$NAMESPACE"
    echo ""

    # Database connectivity
    echo -e "${YELLOW}Testing database connectivity...${NC}"
    POD=$(kubectl get pod -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}')
    if [ -n "$POD" ]; then
        kubectl exec -n "$NAMESPACE" "$POD" -- \
            curl -s http://localhost:3000/health | grep -q "ok" && \
            echo -e "${GREEN}✅ Backend health check passed${NC}" || \
            echo -e "${RED}❌ Backend health check failed${NC}"
    fi
}

# Main
COMMAND="${1:-}"

case "$COMMAND" in
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    list)
        list_backups
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {backup|restore|list|health}"
        echo ""
        echo "Commands:"
        echo "  backup              Create a full system backup"
        echo "  restore <file>      Restore from backup file"
        echo "  list                List available backups"
        echo "  health              Check system health"
        exit 1
        ;;
esac
