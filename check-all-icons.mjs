import * as Icons from 'lucide-react';

const iconsToCheck = [
    'ChevronLeft', 'Edit', 'Trash2', 'User', 'Building', 'Phone', 'Mail', 'MapPin',
    'Briefcase', 'Layers', 'FileText', 'Calendar', 'AlertTriangle', 'Search', 'Sync',
    'Plus', 'Circle', 'CheckCircle2', 'QrCode', 'Monitor', 'RefreshCw'
];

iconsToCheck.forEach(name => {
    console.log(`${name}: ${typeof Icons[name]}`);
});
