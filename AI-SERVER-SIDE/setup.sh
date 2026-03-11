#!/usr/bin/env bash
# Comprehensive setup and launcher for Dental AI Backend
# Works on Windows (Git Bash/MINGW64), macOS, and Linux

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Setup variables
PYTHON_CMD=""
PIP_CMD=""
VENV_PYTHON=""

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

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# ==============================================================================
# ENVIRONMENT SETUP
# ==============================================================================

setup_python_commands() {
    # Determine Python command
    if command -v python &> /dev/null; then
        PYTHON_CMD="python"
    elif command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    else
        print_error "Python not found (need 3.9+)"
        return 1
    fi
    
    # Determine pip path
    if [ -f "venv/Scripts/pip.exe" ]; then
        PIP_CMD="venv/Scripts/pip.exe"
    elif [ -f "venv/Scripts/pip" ]; then
        PIP_CMD="venv/Scripts/pip"
    elif [ -f "venv/bin/pip" ]; then
        PIP_CMD="venv/bin/pip"
    else
        print_error "pip not found in venv"
        return 1
    fi
    
    # Determine venv python
    if [ -f "venv/Scripts/python.exe" ]; then
        VENV_PYTHON="venv/Scripts/python.exe"
    elif [ -f "venv/Scripts/python" ]; then
        VENV_PYTHON="venv/Scripts/python"
    elif [ -f "venv/bin/python" ]; then
        VENV_PYTHON="venv/bin/python"
    else
        print_error "Python not found in venv"
        return 1
    fi
    
    return 0
}

# ==============================================================================
# HEALTH CHECKS
# ==============================================================================

check_python() {
    if ! command -v $PYTHON_CMD &> /dev/null; then
        print_error "Python not found"
        return 1
    fi
    VERSION=$($PYTHON_CMD --version 2>&1)
    print_success "Python: $VERSION"
    return 0
}

check_venv() {
    if [ ! -f "venv/pyvenv.cfg" ] && [ ! -f "venv/Scripts/python.exe" ] && [ ! -f "venv/bin/python" ]; then
        print_warning "Virtual environment not found"
        return 1
    fi
    print_success "Virtual environment exists"
    return 0
}

check_models() {
    local yolo_missing=false
    local resnet_missing=false
    
    if [ ! -f "models/detection.pt" ]; then
        yolo_missing=true
    fi
    
    if [ ! -f "models/classification.pth" ]; then
        resnet_missing=true
    fi
    
    if [ "$yolo_missing" = true ] || [ "$resnet_missing" = true ]; then
        print_error "Model files missing:"
        if [ "$yolo_missing" = true ]; then
            echo -e "         ${RED}✗${NC} models/detection.pt (YOLOv8)"
        fi
        if [ "$resnet_missing" = true ]; then
            echo -e "         ${RED}✗${NC} models/classification.pth (ResNet50)"
        fi
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
    
    GEMINI_KEY=$(grep "^GEMINI_API_KEY=" .env | cut -d'=' -f2)
    
    if [ -z "$GEMINI_KEY" ] || [ "$GEMINI_KEY" = "your_gemini_api_key_here" ]; then
        print_warning ".env: GEMINI_API_KEY not configured"
        return 1
    fi
    
    print_success ".env file configured"
    return 0
}

check_dependencies() {
    if $VENV_PYTHON -c "import fastapi, ultralytics, torch, google.generativeai" 2>/dev/null; then
        print_success "Dependencies installed"
        return 0
    else
        print_error "Some dependencies missing"
        return 1
    fi
}

check_requirements() {
    if [ ! -f "requirements.txt" ]; then
        print_error "requirements.txt not found"
        return 1
    fi
    print_success "requirements.txt found"
    return 0
}

# ==============================================================================
# ACTIONS
# ==============================================================================

action_create_venv() {
    print_info "Creating virtual environment..."
    if $PYTHON_CMD -m venv venv; then
        print_success "Virtual environment created"
        
        # Re-setup commands after creating venv
        if setup_python_commands; then
            return 0
        fi
    else
        print_error "Failed to create virtual environment"
        return 1
    fi
    return 1
}

action_install_deps() {
    print_info "Installing dependencies (this may take a few minutes)..."
    echo ""
    
    if [ ! -f "$PIP_CMD" ]; then
        print_error "pip not found"
        return 1
    fi
    
    # Show what packages will be installed
    print_info "Packages to install:"
    while IFS= read -r line; do
        if [[ ! $line =~ ^# ]] && [ ! -z "$line" ]; then
            echo "     • $line"
        fi
    done < requirements.txt
    
    echo ""
    print_info "Installing packages..."
    echo ""
    
    # Install with progress output
    if $PIP_CMD install -r requirements.txt --progress-bar on -v 2>&1 | while IFS= read -r line; do
        # Show progress lines
        if [[ $line =~ "Collecting" ]]; then
            echo -e "  ${BLUE}○${NC} ${line#*Collecting }"
        elif [[ $line =~ "Downloading" ]]; then
            echo -e "  ${YELLOW}⬇${NC} ${line#*Downloading }"
        elif [[ $line =~ "Installing collected" ]]; then
            echo -e "  ${GREEN}✓${NC} ${line}"
        elif [[ $line =~ "Successfully installed" ]]; then
            echo -e "  ${GREEN}✓${NC} ${line}"
        elif [[ $line =~ "Requirement already satisfied" ]]; then
            pkg=$(echo "$line" | grep -oP "(?<=Requirement already satisfied: )[^ ]+" || true)
            [ ! -z "$pkg" ] && echo -e "  ${GREEN}✓${NC} Already installed: $pkg"
        fi
    done; then
        echo ""
        print_success "Dependencies installed"
        return 0
    else
        echo ""
        print_error "Failed to install dependencies"
        return 1
    fi
}

action_test_imports() {
    print_info "Testing package imports..."
    
    if $VENV_PYTHON -c "
import fastapi
import uvicorn
import torch
import ultralytics
from PIL import Image
import google.generativeai
from pydantic import BaseModel
print('  All imports successful')
"; then
        print_success "All imports working"
        return 0
    else
        print_error "Import test failed"
        return 1
    fi
}

action_run_server() {
    print_info "Starting FastAPI server..."
    echo ""
    print_warning "Press Ctrl+C to stop the server"
    echo ""
    
    $VENV_PYTHON run.py
}

action_run_api_tests() {
    print_info "Running API tests (server must be running)..."
    echo ""
    
    if $VENV_PYTHON tests/test_api.py; then
        print_success "All tests completed"
        return 0
    else
        print_error "Some tests failed"
        return 1
    fi
}

# ==============================================================================
# MENUS
# ==============================================================================

show_status() {
    print_header "🏥 SYSTEM STATUS"
    
    check_python || true
    check_venv || true
    
    if check_venv; then
        check_dependencies || true
    fi
    
    check_requirements || true
    check_models || true
    check_env || true
    
    echo ""
}

show_main_menu() {
    print_header "🚀 DENTAL AI BACKEND LAUNCHER"
    
    echo ""
    echo "  1) 🔧 Setup (Create venv & install dependencies)"
    echo "  2) 📋 System Status (Check all requirements)"
    echo "  3) 🧪 Test Imports (Run import tests)"
    echo "  4) 🧪 Test API (Run comprehensive API endpoint tests)"
    echo "  5) ▶️  Run Server (Start FastAPI backend)"
    echo "  6) ❌ Exit"
    echo ""
    echo -n "  Choose option [1-6]: "
}

# ==============================================================================
# MAIN LOGIC
# ==============================================================================

main() {
    # Initialize
    if ! setup_python_commands; then
        print_error "Failed to setup Python commands"
        exit 1
    fi
    
    # Main loop
    while true; do
        show_main_menu
        read -r choice
        
        case $choice in
            1)
                print_header "🔧 SETUP"
                
                if ! check_venv; then
                    action_create_venv || continue
                fi
                
                action_install_deps || continue
                action_test_imports || continue
                
                print_success "Setup complete!"
                echo ""
                ;;
            
            2)
                show_status
                echo -n "Press Enter to continue..."
                read -r
                ;;
            
            3)
                print_header "🧪 TESTING IMPORTS"
                
                if ! check_venv; then
                    print_error "Virtual environment not found. Run Setup first (option 1)"
                else
                    action_test_imports
                fi
                
                echo ""
                echo -n "Press Enter to continue..."
                read -r
                ;;
            
            4)
                print_header "🧪 TESTING API ENDPOINTS"
                
                if ! check_venv; then
                    print_error "Virtual environment not found. Run Setup first (option 1)"
                    echo ""
                    echo -n "Press Enter to continue..."
                    read -r
                else
                    print_warning "Ensure the server is running in another terminal (option 5)"
                    echo ""
                    echo -n "Press Enter to start tests..."
                    read -r
                    echo ""
                    action_run_api_tests
                    echo ""
                    echo -n "Press Enter to continue..."
                    read -r
                fi
                ;;
            
            5)
                print_header "▶️  PRE-LAUNCH CHECKS"
                
                # Pre-launch checks
                READY=true
                
                if ! check_venv; then
                    print_error "Virtual environment not found. Run Setup first (option 1)"
                    READY=false
                fi
                
                if ! check_models; then
                    print_error "Model files missing. Add them to models/ directory"
                    READY=false
                fi
                
                if ! check_env; then
                    print_error "Configure GEMINI_API_KEY in .env file"
                    READY=false
                fi
                
                if ! check_dependencies; then
                    print_warning "Dependencies may be missing"
                    READY=false
                fi
                
                if [ "$READY" = true ]; then
                    print_success "All checks passed!"
                    echo ""
                    action_run_server
                else
                    echo ""
                    echo -n "Press Enter to continue..."
                    read -r
                fi
                ;;
            
            6)
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

# ==============================================================================
# ENTRY POINT
# ==============================================================================

if [ $# -eq 0 ]; then
    # Interactive mode
    main
else
    # Handle command line arguments
    case $1 in
        --status|status)
            setup_python_commands
            show_status
            ;;
        --help|help|-h)
            echo "Dental AI Backend Setup & Launcher"
            echo ""
            echo "Usage: ./setup.sh [COMMAND]"
            echo ""
            echo "Commands:"
            echo "  (no args)     Interactive menu"
            echo "  status        Show system status"
            echo "  help          Show this help"
            echo ""
            ;;
        *)
            print_error "Unknown command: $1"
            echo "Run: ./setup.sh --help"
            exit 1
            ;;
    esac
fi
