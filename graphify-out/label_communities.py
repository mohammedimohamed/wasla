import json
from pathlib import Path

analysis = json.loads(Path('graphify-out/.graphify_analysis.json').read_text())
extraction = json.loads(Path('graphify-out/.graphify_extract.json').read_text())
node_labels = {n['id']: n['label'] for n in extraction['nodes']}
comms = analysis['communities']

labels = {}
for cid, members in comms.items():
    # Simple heuristic: use the top node labels to guess the community name
    member_names = [node_labels.get(m, m) for m in members[:5]]
    if any("auth" in n.lower() for n in member_names):
        labels[int(cid)] = "Authentication & Security"
    elif any("db" in n.lower() or "sqlite" in n.lower() for n in member_names):
        labels[int(cid)] = "Database & Migrations"
    elif any("admin" in n.lower() for n in member_names):
        labels[int(cid)] = "Admin Dashboard"
    elif any("api" in n.lower() for n in member_names):
        labels[int(cid)] = "API Routes"
    elif any("component" in n.lower() or "ui" in n.lower() for n in member_names):
        labels[int(cid)] = "UI Components"
    elif any("lead" in n.lower() for n in member_names):
        labels[int(cid)] = "Lead Management"
    elif any("reward" in n.lower() for n in member_names):
        labels[int(cid)] = "Rewards Engine"
    elif any("kiosk" in n.lower() for n in member_names):
        labels[int(cid)] = "Kiosk System"
    else:
        labels[int(cid)] = f"Module: {member_names[0]}"

Path('graphify-out/.graphify_labels.json').write_text(json.dumps({str(k): v for k, v in labels.items()}, indent=2))
print(f"Generated {len(labels)} community labels")
