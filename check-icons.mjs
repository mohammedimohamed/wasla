import * as Icons from 'lucide-react';

const iconsToCheck = [
    'Plus',
    'Users',
    'CloudSync',
    'CheckCircle',
    'Monitor',
    'LogOut',
    'Signal',
    'SignalLow'
];

iconsToCheck.forEach(name => {
    console.log(`${name}: ${typeof Icons[name]}`);
});
