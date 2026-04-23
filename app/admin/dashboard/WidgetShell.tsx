import { GripVertical, Pencil, Trash2, Maximize2, Minimize2 } from "lucide-react";
import KpiWidget from "./widgets/KpiWidget";
import QuickLinkWidget from "./widgets/QuickLinkWidget";
import TextWidget from "./widgets/TextWidget";
import HeadingWidget from "./widgets/HeadingWidget";
import RecentLeadsWidget from "./widgets/RecentLeadsWidget";
import SourceChartWidget from "./widgets/SourceChartWidget";
import SpacerWidget from "./widgets/SpacerWidget";

const WIDGET_MAP: Record<string, React.FC<any>> = {
    'kpi': KpiWidget,
    'quicklink': QuickLinkWidget,
    'module-link': QuickLinkWidget,
    'text': TextWidget,
    'heading': HeadingWidget,
    'recent-leads': RecentLeadsWidget,
    'source-chart': SourceChartWidget,
    'spacer': SpacerWidget,
};

export default function WidgetShell({ 
    widget, 
    isEditMode, 
    onEdit, 
    onDelete, 
    onResize,
    onDragStart,
    onDragOver,
    onDrop
}: { 
    widget: any, 
    isEditMode: boolean,
    onEdit: () => void,
    onDelete: () => void,
    onResize: () => void,
    onDragStart: (e: React.DragEvent) => void,
    onDragOver: (e: React.DragEvent) => void,
    onDrop: (e: React.DragEvent) => void
}) {
    const Component = WIDGET_MAP[widget.type];
    
    if (!Component) {
        return <div className="p-4 bg-red-50 text-red-500 rounded-[32px] border border-red-200">Unknown widget type: {widget.type}</div>;
    }

    // Wrap the widget to handle grid spans
    let colSpanClass = 'col-span-1';
    if (widget.col_span === 2) colSpanClass = 'col-span-1 md:col-span-2';
    if (widget.col_span === 3) colSpanClass = 'col-span-1 md:col-span-3';
    if (widget.col_span >= 4 || widget.type === 'heading') colSpanClass = 'col-span-1 md:col-span-4'; // Heading is always full width

    return (
        <div 
            className={`relative group ${colSpanClass}`}
            draggable={isEditMode}
            onDragStart={isEditMode ? onDragStart : undefined}
            onDragOver={isEditMode ? onDragOver : undefined}
            onDrop={isEditMode ? onDrop : undefined}
        >
            {isEditMode && (
                <div className="absolute inset-0 z-20 border-2 border-indigo-400 border-dashed rounded-[32px] bg-indigo-50/30 cursor-move" />
            )}
            
            {isEditMode && (
                <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-white p-1 rounded-full shadow-lg border border-slate-100">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors" title="Configurer">
                        <Pencil className="w-4 h-4" />
                    </button>
                    {widget.type !== 'heading' && widget.type !== 'spacer' && (
                        <button onClick={(e) => { e.stopPropagation(); onResize(); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-colors" title="Redimensionner">
                            {widget.col_span === 1 ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                        </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                    </div>
                </div>
            )}
            
            <div className={`h-full ${isEditMode ? 'opacity-50 pointer-events-none' : ''}`}>
                <Component config={widget.config || {}} />
            </div>
        </div>
    );
}
