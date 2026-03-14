#!/usr/bin/env bash

set -e

# Simple setup script for Smart Dental AI Backend.
# Works on Windows (Git Bash/MINGW64), macOS, and Linux.

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_NAME="Smart Dental AI Backend"
ENV_FILE=".env"
ENV_EXAMPLE_FILE=".env.example"

# ==============================================================================
# UTILITY FUNCTIONS
# ==============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}$(printf '=%.0s' {1..60})${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..60})${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# ==============================================================================
# HEALTH CHECKS
# ==============================================================================

check_command() {
    local cmd="$1"

    if command -v "$cmd" >/dev/null 2>&1; then
        print_success "$cmd found"
        return 0
    fi

    print_error "$cmd is not installed or not available in PATH"
    return 1
}

check_node() {
    if ! command -v node >/dev/null 2>&1; then
        print_error "Node.js not found"
        return 1
    fi

    print_success "Node: $(node --version)"
    return 0
}

check_npm() {
    if ! command -v npm >/dev/null 2>&1; then
        print_error "npm not found"
        return 1
    fi

    print_success "npm: $(npm --version)"
    return 0
}

check_mongodb() {
    if node -e "const net=require('net');const socket=net.connect({host:'127.0.0.1',port:27017});socket.on('connect',()=>{console.log('ok');socket.end();process.exit(0);});socket.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),1500);" >/dev/null 2>&1; then
        print_success "MongoDB appears to be running on 127.0.0.1:27017"
        return 0
    fi

    print_warning "MongoDB is not reachable on 127.0.0.1:27017"
    return 1
}

check_project_files() {
    local missing=false

    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        missing=true
    fi

    if [ ! -f "$ENV_EXAMPLE_FILE" ]; then
        print_error "$ENV_EXAMPLE_FILE not found"
        missing=true
    fi

    if [ "$missing" = true ]; then
        return 1
    fi

    print_success "Project files are present"
    return 0
}

# ==============================================================================
# ACTIONS
# ==============================================================================

setup_env_file() {
    if [ -f "$ENV_FILE" ]; then
        print_success "$ENV_FILE already exists"
        return 0
    fi

    cp "$ENV_EXAMPLE_FILE" "$ENV_FILE"
    print_success "Created $ENV_FILE from $ENV_EXAMPLE_FILE"
}

setup_uploads_folder() {
    mkdir -p uploads
    touch uploads/.gitkeep
    print_success "Uploads directory is ready"
}

install_dependencies() {
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

run_server() {
    print_info "Starting backend server..."
    echo ""
    print_warning "Press Ctrl+C to stop the server"
    echo ""
    npm run dev
}

run_tests() {
    print_header "RUNNING TESTS"

    check_command node || return 1
    check_command npm || return 1

    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        return 1
    fi

    if [ -d "coverage" ]; then
        rm -rf coverage
    fi

    print_info "Running test suite..."
    npm test -- --coverage=false
}

show_status() {
    print_header "SYSTEM STATUS"
    check_node || return 1
    check_npm || return 1
    check_project_files || return 1
    check_mongodb || true

    if [ -f "$ENV_FILE" ]; then
        print_success "$ENV_FILE exists"
    else
        print_warning "$ENV_FILE not found yet"
    fi

    if [ -d "uploads" ]; then
        print_success "uploads folder exists"
    else
        print_warning "uploads folder not found yet"
    fi

    return 0
}

run_setup() {
    print_header "SETTING UP ${PROJECT_NAME}"

    check_command node || exit 1
    check_command npm || exit 1

    echo ""
    show_status || exit 1

    print_header "INSTALLING DEPENDENCIES"
    install_dependencies

    print_header "PREPARING PROJECT FILES"
    setup_uploads_folder
    setup_env_file

    print_header "SETUP COMPLETE"
    print_info "Next steps:"
    echo "1. Review $ENV_FILE and update JWT_SECRET if needed."
    echo "2. Make sure MongoDB is running."
    echo "3. Start the backend with: npm run dev"
    echo "4. Make sure the AI server is running at the URL in $ENV_FILE"
}

show_main_menu() {
    print_header "SMART DENTAL AI BACKEND LAUNCHER"

    echo ""
    echo "  1) Setup"
    echo "  2) System Status"
    echo "  3) Run Server"
    echo "  4) Run Tests"
    echo "  5) Exit"
    echo ""
    echo -n "  Choose option [1-5]: "
}

main() {
    while true; do
        show_main_menu
        read -r choice

        case $choice in
            1)
                run_setup
                echo ""
                echo -n "Press Enter to continue..."
                read -r
                ;;

            2)
                show_status || true
                echo ""
                echo -n "Press Enter to continue..."
                read -r
                ;;

            3)
                print_header "PRE-LAUNCH CHECKS"

                READY=true

                if ! check_node; then
                    READY=false
                fi

                if ! check_npm; then
                    READY=false
                fi

                if ! check_project_files; then
                    READY=false
                fi

                if [ ! -f "$ENV_FILE" ]; then
                    print_error "$ENV_FILE not found. Run Setup first."
                    READY=false
                fi

                if ! check_mongodb; then
                    READY=false
                fi

                if [ ! -d "uploads" ]; then
                    print_error "uploads folder not found. Run Setup first."
                    READY=false
                fi

                if [ "$READY" = true ]; then
                    print_success "All checks passed!"
                    echo ""
                    run_server
                else
                    echo ""
                    echo -n "Press Enter to continue..."
                    read -r
                fi
                ;;

            4)
                run_tests || true
                echo ""
                echo -n "Press Enter to continue..."
                read -r
                ;;

            5)
                print_info "Exiting..."
                exit 0
                ;;

            *)
                print_error "Invalid option"
                sleep 1
                ;;
        esac
    done
}

if [ $# -eq 0 ]; then
    main
else
    case $1 in
        setup)
            run_setup
            ;;
        status|--status)
            show_status
            ;;
        run)
            run_server
            ;;
        test)
            run_tests
            ;;
        help|--help|-h)
            echo "Smart Dental AI Backend Setup & Launcher"
            echo ""
            echo "Usage: ./setup.sh [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  (no args)     Interactive menu"
            echo "  setup         Run backend setup"
            echo "  status        Show system status"
            echo "  run           Start the backend server"
            echo "  test          Run backend tests"
            echo "  help          Show this help"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Run: ./setup.sh --help"
            exit 1
            ;;
    esac
fi