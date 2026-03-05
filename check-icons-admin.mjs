import * as Icons from 'lucide-react';

const iconsToCheck = [
    'BarChart3',
    'Gift',
    'Download',
    'Users',
    'ArrowLeft',
    'Settings',
    'ChevronRight',
    'TrendingUp',
    'Globe',
    'Monitor'
];

iconsToCheck.forEach(name => {
    console.log(`${name}: ${typeof Icons[name]}`);
});
