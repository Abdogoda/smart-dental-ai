# app/urgency_analyzer.py
"""Determine urgency level based on classification and detection results."""

from app.schemas import DetectionResult


# High urgency conditions - require immediate attention
HIGH_URGENCY_KEYWORDS = {
    'caries', 'cavity', 'cavities', 'decay', 'carries',
    'abscess', 'infection', 'infected', 'periapical',
    'periodontitis', 'severe gingivitis', 'bone loss',
    'pulpitis', 'pulp inflammation', 'root canal',
    'fractured', 'broken', 'trauma', 'severe', 'critical'
}

# Medium urgency conditions - need follow-up
MEDIUM_URGENCY_KEYWORDS = {
    'gingivitis', 'gum inflammation', 'bleeding',
    'calculus', 'tartar', 'plaque buildup',
    'discoloration', 'staining', 'erosion',
    'mild recession', 'sensitivity', 'enamel wear'
}

# Confidence thresholds
HIGH_URGENCY_THRESHOLD = 0.6  # >= 60% confidence in high urgency condition
MEDIUM_URGENCY_THRESHOLD = 0.4  # >= 40% confidence in medium urgency condition


def analyze_urgency(detection: DetectionResult) -> str:
    """
    Determine urgency level based on classification and detection results.
    
    Args:
        detection: DetectionResult containing classification and detection data
        
    Returns:
        'high', 'medium', or 'low'
    """
    max_high_confidence = 0.0
    max_medium_confidence = 0.0
    high_urgency_found = False
    medium_urgency_found = False
    
    # Analyze classification probabilities
    if detection.classification:
        for class_name, probability in detection.classification.items():
            class_lower = class_name.lower()
            
            # Check for high urgency conditions
            if any(keyword in class_lower for keyword in HIGH_URGENCY_KEYWORDS):
                high_urgency_found = True
                max_high_confidence = max(max_high_confidence, probability)
            
            # Check for medium urgency conditions
            elif any(keyword in class_lower for keyword in MEDIUM_URGENCY_KEYWORDS):
                medium_urgency_found = True
                max_medium_confidence = max(max_medium_confidence, probability)
    
    # Analyze detections
    if detection.detections:
        for det in detection.detections:
            label_lower = det.label.lower()
            
            if any(keyword in label_lower for keyword in HIGH_URGENCY_KEYWORDS):
                high_urgency_found = True
                max_high_confidence = max(max_high_confidence, det.confidence)
            elif any(keyword in label_lower for keyword in MEDIUM_URGENCY_KEYWORDS):
                medium_urgency_found = True
                max_medium_confidence = max(max_medium_confidence, det.confidence)
    
    # Determine urgency level
    if high_urgency_found and max_high_confidence >= HIGH_URGENCY_THRESHOLD:
        return 'high'
    elif medium_urgency_found and max_medium_confidence >= MEDIUM_URGENCY_THRESHOLD:
        return 'medium'
    elif high_urgency_found:
        return 'medium'  # Found but low confidence, still check
    else:
        return 'low'


def get_urgency_action_plan(urgency_level: str, detection: DetectionResult) -> list:
    """
    Generate action plan based on urgency level and findings.
    
    Args:
        urgency_level: 'high', 'medium', or 'low'
        detection: DetectionResult for context
        
    Returns:
        List of recommended actions
    """
    action_plans = {
        'high': [
            'Schedule emergency dental appointment within 24-48 hours',
            'Take over-the-counter pain relief if experiencing discomfort',
            'Avoid chewing on affected side if applicable',
            'Rinse with salt water 2-3 times daily'
        ],
        'medium': [
            'Schedule dental appointment within 1-2 weeks',
            'Increase brushing and flossing frequency',
            'Use antimicrobial mouthwash as directed',
            'Avoid staining foods/drinks if applicable'
        ],
        'low': [
            'Maintain regular brushing and flossing routine',
            'Schedule routine dental checkup (6-12 months)',
            'Continue preventive oral hygiene practices',
            'Maintain healthy diet and lifestyle'
        ]
    }
    
    return action_plans.get(urgency_level, action_plans['low'])
