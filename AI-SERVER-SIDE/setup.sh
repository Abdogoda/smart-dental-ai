#!/usr/bin/env bash
# Simplified setup and launcher for Dental AI Backend
# Works on Windows (Git Bash), macOS, and Linux

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PYTHON_CMD=""
VENV_PYTHON=""

print_header() {
    echo ""
    echo -e "${BLUE}$(printf '=%.0s' {1..60})${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}$(printf '=%.0s' {1..60})${NC}"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

setup_python_commands() {
    if command -v python >/dev/null 2>&1; then
        PYTHON_CMD="python"
    elif command -v python3 >/dev/null 2>&1; then
        PYTHON_CMD="python3"
    else
        print_error "Python not found (need 3.9+)"
        return 1
    fi

    if [ -f "venv/Scripts/python.exe" ]; then
        VENV_PYTHON="venv/Scripts/python.exe"
    elif [ -f "venv/Scripts/python" ]; then
        VENV_PYTHON="venv/Scripts/python"
    elif [ -f "venv/bin/python" ]; then
        VENV_PYTHON="venv/bin/python"
    else
        VENV_PYTHON=""
    fi

    return 0
}

check_python() {
    if ! command -v "$PYTHON_CMD" >/dev/null 2>&1; then
        print_error "Python command is not available"
        return 1
    fi
    local version
    version=$($PYTHON_CMD --version 2>&1)
    print_success "Python: $version"
    return 0
}

check_venv() {
    if [ -z "$VENV_PYTHON" ] || [ ! -f "$VENV_PYTHON" ]; then
        print_warning "Virtual environment not found"
        return 1
    fi
    print_success "Virtual environment exists"
    return 0
}

check_requirements() {
    if [ ! -f "requirements.txt" ]; then
        print_error "requirements.txt not found"
        return 1
    fi
    print_success "requirements.txt found"
    return 0
}

check_dependencies() {
    if [ -z "$VENV_PYTHON" ] || [ ! -f "$VENV_PYTHON" ]; then
        print_warning "Cannot check dependencies without venv"
        return 1
    fi

    if $VENV_PYTHON -c "import fastapi, ultralytics, torch, google.generativeai" >/dev/null 2>&1; then
        print_success "Dependencies installed"
        return 0
    fi

    print_error "Some dependencies are missing"
    return 1
}

check_models() {
    local missing=false

    if [ ! -f "models/detection.pt" ]; then
        print_error "Missing models/detection.pt"
        missing=true
    fi
    if [ ! -f "models/classification.pth" ]; then
        print_error "Missing models/classification.pth"
        missing=true
    fi

    if [ "$missing" = true ]; then
        return 1
    fi

    print_success "Model files present"
    return 0
}

check_env() {
    if [ ! -f ".env" ]; then
        print_error ".env file not found"
        return 1
    fi

    local gemini_key
    gemini_key=$(grep "^GEMINI_API_KEY=" .env | cut -d'=' -f2)
    if [ -z "$gemini_key" ] || [ "$gemini_key" = "your_gemini_api_key_here" ]; then
        print_warning "GEMINI_API_KEY is not configured"
        return 1
    fi

    print_success ".env file configured"
    return 0
}

action_create_venv() {
    print_info "Creating virtual environment..."
    if ! $PYTHON_CMD -m venv venv; then
        print_error "Failed to create virtual environment"
        return 1
    fi

    setup_python_commands
    print_success "Virtual environment created"
    return 0
}

action_install_deps() {
    if [ -z "$VENV_PYTHON" ] || [ ! -f "$VENV_PYTHON" ]; then
        print_error "Virtual environment Python not found"
        return 1
    fi

    print_info "Installing dependencies..."

    if ! $VENV_PYTHON -m pip --version >/dev/null 2>&1; then
        print_warning "pip missing in venv, running ensurepip..."
        if ! $VENV_PYTHON -m ensurepip --upgrade; then
            print_error "Failed to bootstrap pip in venv"
            return 1
        fi
    fi

    if $VENV_PYTHON -m pip install -r requirements.txt; then
        print_success "Dependencies installed"
        return 0
    fi

    print_error "Failed to install dependencies"
    return 1
}

action_ensure_env() {
    if [ -f ".env" ]; then
        print_success ".env file exists"
        return 0
    fi

    if [ ! -f ".env.example" ]; then
        print_error ".env is missing and .env.example was not found"
        return 1
    fi

    if cp .env.example .env; then
        print_success "Created .env from .env.example"
        return 0
    fi

    print_error "Failed to create .env from .env.example"
    return 1
}

action_run_api_tests() {
    print_info "Running API tests (server must be running)..."
    if $VENV_PYTHON tests/test_api.py; then
        print_success "API tests completed"
        return 0
    fi
    print_error "API tests failed"
    return 1
}

action_run_server() {
    print_info "Starting FastAPI server..."
    print_warning "Press Ctrl+C to stop the server"
    $VENV_PYTHON run.py
}

show_status() {
    print_header "SYSTEM STATUS"
    check_python || true
    check_venv || true
    check_requirements || true
    if check_venv; then
        check_dependencies || true
    fi
    check_models || true
    check_env || true
    echo ""
}

show_main_menu() {
    print_header "DENTAL AI BACKEND LAUNCHER"
    echo ""
    echo "  1) Setup (Create venv and install dependencies)"
    echo "  2) System Status"
    echo "  3) Test API"
    echo "  4) Run Server"
    echo "  5) Exit"
    echo ""
    echo -n "  Choose option [1-5]: "
}

main() {
    if ! setup_python_commands; then
        print_error "Failed to configure Python commands"
        exit 1
    fi

    while true; do
        show_main_menu
        read -r choice

        case $choice in
            1)
                print_header "SETUP"
                check_requirements || continue
                action_ensure_env || continue
                if ! check_venv; then
                    action_create_venv || continue
                fi
                action_install_deps || continue
                print_success "Setup complete"
                echo ""
                ;;
            2)
                show_status
                echo -n "Press Enter to continue..."
                read -r
                ;;
            3)
                print_header "TEST API"
                if ! check_venv; then
                    print_error "Virtual environment not found. Run Setup first (option 1)."
                else
                    action_run_api_tests
                fi
                echo ""
                echo -n "Press Enter to continue..."
                read -r
                ;;
            4)
                print_header "RUN SERVER"
                local ready=true

                if ! check_venv; then
                    ready=false
                fi
                if ! check_dependencies; then
                    ready=false
                fi
                if ! check_models; then
                    ready=false
                fi
                if ! check_env; then
                    ready=false
                fi

                if [ "$ready" = true ]; then
                    action_run_server
                else
                    echo ""
                    echo -n "Press Enter to continue..."
                    read -r
                fi
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
        --status|status)
            setup_python_commands || exit 1
            show_status
            ;;
        --help|help|-h)
            echo "Dental AI Backend Setup and Launcher"
            echo ""
            echo "Usage: ./setup.sh [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  (no args)  Interactive menu"
            echo "  status     Show system status"
            echo "  help       Show this help"
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Run: ./setup.sh --help"
            exit 1
            ;;
    esac
fi
