import WidgetShell from "./WidgetShell";

export default function WidgetGrid({
    widgets,
    isEditMode,
    onEditWidget,
    onDeleteWidget,
    onResizeWidget,
    onDragStart,
    onDragOver,
    onDrop
}: {
    widgets: any[],
    isEditMode: boolean,
    onEditWidget: (id: string) => void,
    onDeleteWidget: (id: string) => void,
    onResizeWidget: (id: string) => void,
    onDragStart: (e: React.DragEvent, index: number) => void,
    onDragOver: (e: React.DragEvent, index: number) => void,
    onDrop: (e: React.DragEvent, index: number) => void
}) {
    if (widgets.length === 0 && !isEditMode) {
        return (
            <div className="bg-white rounded-[40px] border-4 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center shadow-sm">
                <h2 className="text-2xl font-black text-slate-800 mb-2">Tableau de bord vide</h2>
                <p className="text-slate-500 max-w-md mx-auto text-sm font-medium">
                    Aucun widget n'a été configuré. Cliquez sur "Personnaliser" pour ajouter vos premiers indicateurs.
                </p>
            </div>
        );
    }

    return (
        <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${isEditMode ? 'pb-32' : ''}`}>
            {widgets.map((widget, index) => (
                <WidgetShell
                    key={widget.id}
                    widget={widget}
                    isEditMode={isEditMode}
                    onEdit={() => onEditWidget(widget.id)}
                    onDelete={() => onDeleteWidget(widget.id)}
                    onResize={() => onResizeWidget(widget.id)}
                    onDragStart={(e) => onDragStart(e, index)}
                    onDragOver={(e) => onDragOver(e, index)}
                    onDrop={(e) => onDrop(e, index)}
                />
            ))}
        </div>
    );
}
