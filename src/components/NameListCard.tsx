import { useState, type FormEvent, type ReactNode } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/field";
import { ErrorState, ListSkeleton } from "@/components/ui/misc";

interface Item {
  id: string;
  name: string;
}

interface Props<T extends Item> {
  title: string;
  icon: ReactNode;
  description: string;
  addPlaceholder: string;
  emptyText: string;
  items: T[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  saving: boolean;
  deleting: boolean;
  onAdd: (name: string) => Promise<boolean>;
  onRename: (item: T, name: string) => Promise<boolean>;
  onDelete: (item: T) => Promise<boolean>;
  deleteDescription: (item: T) => string;
  /** Extra controls rendered before the edit/delete buttons (e.g. a "default" toggle). */
  renderExtra?: (item: T) => ReactNode;
  /** Label next to the item name (e.g. "افتراضية"). */
  renderTag?: (item: T) => ReactNode;
}

/** Settings card for a small editable list of names (subjects, grades). */
export function NameListCard<T extends Item>(p: Props<T>) {
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [toDelete, setToDelete] = useState<T | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return toast.error("يرجى كتابة الاسم");
    if (await p.onAdd(name)) setNewName("");
  }

  async function rename(item: T) {
    const name = editName.trim();
    if (!name) return toast.error("يرجى كتابة الاسم");
    if (name === item.name || (await p.onRename(item, name))) setEditId(null);
  }

  return (
    <Card>
      <CardHeader title={p.title} icon={p.icon} />
      <p className="-mt-1 px-5 text-sm leading-relaxed text-muted">{p.description}</p>

      <form onSubmit={add} className="flex gap-2 px-5 pt-4">
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={p.addPlaceholder} aria-label={p.addPlaceholder} />
        <Button type="submit" loading={p.saving && !editId}>
          <Plus />
          إضافة
        </Button>
      </form>

      {p.isError ? (
        <div className="p-5">
          <ErrorState onRetry={p.onRetry} />
        </div>
      ) : p.isLoading ? (
        <div className="pt-4">
          <ListSkeleton rows={4} />
        </div>
      ) : (
        <ul className="mt-3 max-h-[26rem] divide-y divide-line overflow-y-auto pb-2">
          {p.items?.length === 0 && <li className="px-5 py-6 text-center text-sm text-muted">{p.emptyText}</li>}
          {p.items?.map((item) => (
            <li key={item.id} className="group flex min-h-[3.25rem] items-center gap-2 px-5 py-2">
              {editId === item.id ? (
                <form
                  className="flex flex-1 gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    rename(item);
                  }}
                >
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-9" autoFocus aria-label="الاسم" />
                  <Button type="submit" size="icon-sm" aria-label="حفظ" loading={p.saving}>
                    {!p.saving && <Check />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="إلغاء" onClick={() => setEditId(null)}>
                    <X />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex flex-1 items-center gap-2 text-[15px] text-ink">
                    {item.name}
                    {p.renderTag?.(item)}
                  </span>
                  {p.renderExtra?.(item)}
                  <div className="flex gap-0.5 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`تعديل ${item.name}`}
                      onClick={() => {
                        setEditId(item.id);
                        setEditName(item.name);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button variant="danger-ghost" size="icon-sm" aria-label={`حذف ${item.name}`} onClick={() => setToDelete(item)}>
                      <Trash2 />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`حذف ${toDelete?.name ?? ""}`}
        description={toDelete ? p.deleteDescription(toDelete) : ""}
        loading={p.deleting}
        onConfirm={async () => {
          if (toDelete && (await p.onDelete(toDelete))) setToDelete(null);
        }}
      />
    </Card>
  );
}
