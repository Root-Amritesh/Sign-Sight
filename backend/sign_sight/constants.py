"""Canonical constants for the Sign-Sight ML pipeline."""
from __future__ import annotations

# NSL-KDD attack category mapping (5-class: normal + 4 attack types)
# Maps the 39 fine-grained labels to 5 coarse categories
NSL_KDD_CATEGORY_MAP: dict[str, str] = {
    "normal": "NORMAL",
    # DoS attacks
    "back": "DOS", "land": "DOS", "neptune": "DOS", "pod": "DOS",
    "smurf": "DOS", "teardrop": "DOS", "apache2": "DOS", "udpstorm": "DOS",
    "processtable": "DOS", "mailbomb": "DOS",
    # Probe attacks
    "satan": "PROBE", "ipsweep": "PROBE", "nmap": "PROBE", "portsweep": "PROBE",
    "mscan": "PROBE", "saint": "PROBE",
    # R2L attacks
    "guess_passwd": "R2L", "ftp_write": "R2L", "imap": "R2L", "phf": "R2L",
    "multihop": "R2L", "warezmaster": "R2L", "warezclient": "R2L",
    "spy": "R2L", "xlock": "R2L", "xsnoop": "R2L", "snmpguess": "R2L",
    "snmpgetattack": "R2L", "httptunnel": "R2L", "sendmail": "R2L",
    "named": "R2L", "worm": "R2L",
    # U2R attacks
    "buffer_overflow": "U2R", "loadmodule": "U2R", "rootkit": "U2R",
    "perl": "U2R", "sqlattack": "U2R", "xterm": "U2R", "ps": "U2R",
}

# Canonical label order for classification
LABEL_ORDER: list[str] = ["NORMAL", "DOS", "PROBE", "R2L", "U2R"]

# NSL-KDD feature column names (41 features + label + difficulty)
NSL_KDD_COLUMNS: list[str] = [
    "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes",
    "land", "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in",
    "num_compromised", "root_shell", "su_attempted", "num_root",
    "num_file_creations", "num_shells", "num_access_files", "num_outbound_cmds",
    "is_host_login", "is_guest_login", "count", "srv_count", "serror_rate",
    "srv_serror_rate", "rerror_rate", "srv_rerror_rate", "same_srv_rate",
    "diff_srv_rate", "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count",
    "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
    "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate",
    "dst_host_serror_rate", "dst_host_srv_serror_rate", "dst_host_rerror_rate",
    "dst_host_srv_rerror_rate", "label", "difficulty_level",
]

# Features that are categorical and need encoding
CATEGORICAL_FEATURES: list[str] = ["protocol_type", "service", "flag"]

# Features that are numeric (all 41 minus the 3 categorical, minus label and difficulty)
NUMERIC_FEATURES: list[str] = [
    col for col in NSL_KDD_COLUMNS
    if col not in CATEGORICAL_FEATURES + ["label", "difficulty_level"]
]
