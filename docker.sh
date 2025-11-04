#!/bin/bash

# Docker Compose 管理脚本
# Usage: ./docker.sh [dev|prod|stop|restart|logs|clean]

set -e

COMMAND=${1:-dev}

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}✓${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

echo_error() {
    echo -e "${RED}✗${NC} $1"
}

case $COMMAND in
    dev)
        echo_info "Starting development environment..."
        docker-compose -f docker-compose.dev.yml up -d
        echo ""
        echo_info "Services started:"
        echo "  - PostgreSQL: localhost:5432"
        echo "  - Redis: localhost:6379"
        echo "  - Adminer: http://localhost:8080"
        echo "  - Redis Commander: http://localhost:8081"
        echo ""
        echo_info "Run your apps locally:"
        echo "  Terminal 1: cd apps/api && pnpm run start:dev"
        echo "  Terminal 2: cd apps/web && pnpm run dev"
        ;;
    
    prod)
        echo_info "Starting production environment..."
        
        if [ ! -f .env ]; then
            echo_error ".env file not found!"
            echo "Please copy .env.example to .env and configure it"
            exit 1
        fi
        
        docker-compose build
        docker-compose up -d
        echo ""
        echo_info "Services started:"
        echo "  - API: http://localhost:3000"
        echo "  - Web: http://localhost:3001"
        echo "  - PostgreSQL: localhost:5432"
        echo "  - Redis: localhost:6379"
        ;;
    
    nginx)
        echo_info "Starting with Nginx reverse proxy..."
        docker-compose --profile production up -d
        echo ""
        echo_info "Services started:"
        echo "  - API: http://localhost:3000"
        echo "  - Web: http://localhost:3001"
        echo "  - Nginx: http://localhost:80"
        ;;
    
    stop)
        echo_info "Stopping all services..."
        docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
        docker-compose down
        echo_info "All services stopped"
        ;;
    
    restart)
        echo_info "Restarting services..."
        docker-compose restart
        echo_info "Services restarted"
        ;;
    
    logs)
        SERVICE=${2:-}
        if [ -n "$SERVICE" ]; then
            docker-compose logs -f "$SERVICE"
        else
            docker-compose logs -f
        fi
        ;;
    
    ps)
        echo_info "Service status:"
        docker-compose ps
        ;;
    
    clean)
        echo_warn "This will remove all containers, volumes, and networks"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true
            docker-compose down -v
            echo_info "Cleaned up all resources"
        else
            echo_info "Cancelled"
        fi
        ;;
    
    rebuild)
        echo_info "Rebuilding services..."
        docker-compose build --no-cache
        docker-compose up -d
        echo_info "Services rebuilt and started"
        ;;
    
    backup)
        echo_info "Backing up database..."
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="backup_${TIMESTAMP}.sql"
        docker-compose exec -T postgres pg_dump -U postgres study_oasis > "$BACKUP_FILE"
        echo_info "Database backed up to: $BACKUP_FILE"
        ;;
    
    restore)
        BACKUP_FILE=${2:-}
        if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
            echo_error "Backup file not found: $BACKUP_FILE"
            echo "Usage: ./docker.sh restore <backup_file>"
            exit 1
        fi
        echo_info "Restoring database from: $BACKUP_FILE"
        docker-compose exec -T postgres psql -U postgres study_oasis < "$BACKUP_FILE"
        echo_info "Database restored"
        ;;
    
    *)
        echo "Usage: $0 {dev|prod|nginx|stop|restart|logs|ps|clean|rebuild|backup|restore}"
        echo ""
        echo "Commands:"
        echo "  dev       - Start development environment (DB + tools only)"
        echo "  prod      - Start production environment (full stack)"
        echo "  nginx     - Start with Nginx reverse proxy"
        echo "  stop      - Stop all services"
        echo "  restart   - Restart all services"
        echo "  logs      - View logs (optionally specify service)"
        echo "  ps        - Show service status"
        echo "  clean     - Remove all containers, volumes, and networks"
        echo "  rebuild   - Rebuild and restart all services"
        echo "  backup    - Backup database"
        echo "  restore   - Restore database from backup file"
        echo ""
        echo "Examples:"
        echo "  $0 dev"
        echo "  $0 prod"
        echo "  $0 logs api"
        echo "  $0 backup"
        echo "  $0 restore backup_20250115_120000.sql"
        exit 1
        ;;
esac
