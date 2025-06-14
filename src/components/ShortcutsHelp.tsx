
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const shortcuts = [
  { keys: "Ctrl + Enter", description: "Enviar mensagem" },
  { keys: "Ctrl + K", description: "Focar no input" },
  { keys: "Ctrl + /", description: "Mostrar atalhos" },
  { keys: "Ctrl + N", description: "Nova conversa" },
  { keys: "Esc", description: "Fechar modais" },
];

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-umind-gray hover:bg-zinc-800 transition-colors"
        >
          <Keyboard className="h-4 w-4" />
          <span className="sr-only">Atalhos de teclado</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-umind-gray">Atalhos de Teclado</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-umind-gray/80">{shortcut.description}</span>
              <kbd className="bg-zinc-800 text-umind-gray px-2 py-1 rounded text-sm font-mono">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
