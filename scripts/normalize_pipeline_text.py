#!/usr/bin/env python3
"""Normalize font sizes in app/admin/pipeline/PipelineWizard.tsx."""

from pathlib import Path
import re

ROOT = Path("/home/noon/Documents/Projects/arabic-with-m")
FILE = ROOT / "app/admin/pipeline/PipelineWizard.tsx"

text = FILE.read_text()

# Helper to add a property to an sx object string.
def add_to_sx(sx_str: str, prop: str, value: str) -> str:
    """Insert prop: value into an sx={{ ... }} block before the closing brace."""
    # sx_str looks like: sx={{ a: 1, b: 2 }}
    inner = sx_str[4:-2].strip()  # 'a: 1, b: 2'
    if inner.endswith(","):
        inner = inner[:-1].strip()
    new_inner = inner + f', {prop}: "{value}"'
    return f"sx={{{{ {new_inner} }}}}"


# 1. Stage titles: all variant="h5" get fontSize: "1.1rem".
# Pattern: variant="h5" followed by sx={{ ... }} on the next line(s).
# We operate on the sx block directly.
def normalize_h5(match: re.Match) -> str:
    before = match.group(1)
    sx_str = match.group(2)
    after = match.group(3)
    if 'fontSize' in sx_str:
        return match.group(0)
    new_sx = add_to_sx(sx_str, "fontSize", "1.1rem")
    return f'{before}\n          {new_sx}\n{after}'

# Match variant="h5" and the sx block on the following line(s), capturing the sx={{...}}
text = re.sub(
    r'(variant="h5"\n)(\s+sx=\{\{[\s\S]*?\}\})(\n\s*>[^/])',
    normalize_h5,
    text,
)

# 2. h6 card titles in entry step -> 0.95rem.
text = text.replace(
    '<Typography\n                    variant="h6"\n                    sx={{ fontFamily: \'"EB Garamond", serif\', fontWeight: 700, color: "#2c1a0e" }}\n                  >',
    '<Typography\n                    variant="h6"\n                    sx={{ fontFamily: \'"EB Garamond", serif\', fontWeight: 700, color: "#2c1a0e", fontSize: "0.95rem" }}\n                  >',
)

# 3. Generic Jost muted Typography without fontSize -> add 0.95rem.
# This covers card descriptions and several empty-state messages.
text = text.replace(
    '<Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>',
    '<Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "0.95rem" }}>',
)

# 4. Alert components used for stage messages -> add fontSize: "0.95rem".
# We target the common Alert sx patterns in this file.
alert_replacements = [
    # save-episode info alert
    (
        '<Alert severity="info" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>',
        '<Alert severity="info" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "0.95rem" }}>',
    ),
    # review-lemmas info alert
    (
        '<Alert\n          severity="info"\n          icon={<Help />}\n          sx={{\n            mb: 3,\n            fontFamily: "Jost, sans-serif",\n            borderRadius: "10px",\n            color: "#2c1a0e",\n          }}\n        >',
        '<Alert\n          severity="info"\n          icon={<Help />}\n          sx={{\n            mb: 3,\n            fontFamily: "Jost, sans-serif",\n            borderRadius: "10px",\n            color: "#2c1a0e",\n            fontSize: "0.95rem",\n          }}\n        >',
    ),
    # definitions-prompt success alert
    (
        '<Alert\n                    severity="success"\n                    icon={<CheckCircle />}\n                    sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}\n                  >',
        '<Alert\n                    severity="success"\n                    icon={<CheckCircle />}\n                    sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "0.95rem" }}\n                  >',
    ),
    # paste-definitions error alert
    (
        '<Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>',
        '<Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "0.95rem" }}>',
    ),
    # review-definitions error alert
    (
        '<Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>',
        '<Alert severity="error" sx={{ mb: 2, fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "0.95rem" }}>',
    ),
    # conjugation-prompt error alert
    (
        '<Alert severity="error" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>',
        '<Alert severity="error" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "0.95rem" }}>',
    ),
    # conjugation-review skipped verbs warning
    (
        '<Alert severity="warning" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>',
        '<Alert severity="warning" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "0.95rem" }}>',
    ),
    # top-level error alert
    (
        '<Alert severity="error" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>',
        '<Alert severity="error" sx={{ mb: 3, fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "0.95rem" }}>',
    ),
    # ExistingDefinitionsList info alert
    (
        '<Alert severity="info" sx={{ fontFamily: "Jost, sans-serif", borderRadius: "10px" }}>',
        '<Alert severity="info" sx={{ fontFamily: "Jost, sans-serif", borderRadius: "10px", fontSize: "0.95rem" }}>',
    ),
]

for old, new in alert_replacements:
    text = text.replace(old, new)

# 5. Alert title Typography blocks that lack fontSize -> add 0.95rem.
text = text.replace(
    '<Typography sx={{ fontWeight: 600, mb: 0.5 }}>What happens next?</Typography>',
    '<Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.95rem" }}>What happens next?</Typography>',
)
text = text.replace(
    '<Typography sx={{ fontWeight: 600, mb: 0.5 }}>Skipped verbs</Typography>',
    '<Typography sx={{ fontWeight: 600, mb: 0.5, fontSize: "0.95rem" }}>Skipped verbs</Typography>',
)

# 6. Conjugation validation error Typography inside Alert -> add fontSize.
text = text.replace(
    '<Typography sx={{ whiteSpace: "pre-wrap" }}>{state.conjugationValidationError}</Typography>',
    '<Typography sx={{ whiteSpace: "pre-wrap", fontSize: "0.95rem" }}>{state.conjugationValidationError}</Typography>',
)

# 7. ListItemText primary/secondary -> add fontSize: "0.95rem".
text = text.replace(
    'secondary: {\n                        sx: { fontFamily: "Jost, sans-serif", color: "#7a6e65" },\n                      },',
    'secondary: {\n                        sx: { fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "0.95rem" },\n                      },',
)
text = text.replace(
    'primary: {\n                        sx: {\n                          fontFamily: \'"EB Garamond", serif\',\n                          fontWeight: 600,\n                          color: "#2c1a0e",\n                        },\n                      },',
    'primary: {\n                        sx: {\n                          fontFamily: \'"EB Garamond", serif\',\n                          fontWeight: 600,\n                          color: "#2c1a0e",\n                          fontSize: "0.95rem",\n                        },\n                      },',
)

# 8. LemmaTable header font size -> 0.95rem.
text = text.replace(
    'const headerSx = {\n    fontFamily: "Jost, sans-serif",\n    fontWeight: 700,\n    fontSize: "0.85rem",',
    'const headerSx = {\n    fontFamily: "Jost, sans-serif",\n    fontWeight: 700,\n    fontSize: "0.95rem",',
)

# 9. Stepper label font size -> 0.95rem.
text = text.replace(
    '"& .MuiStepLabel-label": {\n                      fontFamily: "Jost, sans-serif",\n                      color: idx === currentStepIndex ? "#2c1a0e" : "#9e8a7a",\n                    },',
    '"& .MuiStepLabel-label": {\n                      fontFamily: "Jost, sans-serif",\n                      color: idx === currentStepIndex ? "#2c1a0e" : "#9e8a7a",\n                      fontSize: "0.95rem",\n                    },',
)

FILE.write_text(text)
print("PipelineWizard.tsx text sizes normalized.")
