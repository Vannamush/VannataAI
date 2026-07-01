import { useListAnthropicConversations, useDeleteAnthropicConversation, getListAnthropicConversationsQueryKey } from "@workspace/api-client-react";
import { Link, useRoute } from "wouter";
import { MessageSquare, Trash2, PlusCircle, Wrench, Edit3, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export function Sidebar() {
  const { data: conversations, isLoading } = useListAnthropicConversations();
  const deleteMutation = useDeleteAnthropicConversation();
  const queryClient = useQueryClient();
  const [match, params] = useRoute("/conversation/:id");
  const activeId = match ? Number(params.id) : null;

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
      }
    });
  };

  return (
    <div className="w-64 border-r bg-sidebar flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b">
        <Link href="/">
          <Button className="w-full justify-start gap-2 shadow-sm font-medium" variant="default">
            <PlusCircle className="h-4 w-4" />
            New Workspace
          </Button>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <h3 className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3 px-2">History</h3>
        
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-2 py-3">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))
        ) : conversations?.length === 0 ? (
          <div className="text-sm text-sidebar-foreground/50 px-2 py-4 text-center">
            No history yet.
          </div>
        ) : (
          conversations?.map((conv) => (
            <Link key={conv.id} href={`/conversation/${conv.id}`}>
              <div className={`
                group relative flex flex-col gap-1 p-2 rounded-md cursor-pointer transition-colors
                ${activeId === conv.id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50 text-sidebar-foreground/80"}
              `}>
                <div className="flex items-center gap-2">
                  {conv.mode === "fix" && <Wrench className="h-3.5 w-3.5 text-primary" />}
                  {conv.mode === "edit" && <Edit3 className="h-3.5 w-3.5 text-primary" />}
                  {conv.mode === "generate" && <FileCode2 className="h-3.5 w-3.5 text-primary" />}
                  <span className="text-sm font-medium truncate flex-1">{conv.title || "Untitled Session"}</span>
                </div>
                <div className="text-xs text-muted-foreground/60 flex items-center justify-between">
                  <span>{new Date(conv.createdAt).toLocaleDateString()}</span>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  onClick={(e) => handleDelete(conv.id, e)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
