"use client";

import React from "react";
import { type NoteObject } from "../types/customer.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, User } from "lucide-react";

interface CustomerNotesProps {
  notes?: NoteObject[] | string;
}

export function CustomerNotes({ notes }: CustomerNotesProps) {
  const getNotesList = (): NoteObject[] => {
    if (!notes) return [];
    if (typeof notes === "string") {
      return [{ _id: "legacy", text: notes, createdBy: "Legacy System", createdAt: new Date().toISOString() }];
    }
    return notes;
  };

  const notesList = getNotesList();

  return (
    <Card className="border border-border/80 shadow-sm animate-in fade-in duration-200">
      <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          Internal Staff Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {notesList.length > 0 ? (
          <div className="space-y-4">
            {notesList.map((note) => {
              const dateObj = new Date(note.createdAt);
              const displayDate = isNaN(dateObj.getTime())
                ? note.createdAt
                : dateObj.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
              const creatorName =
                typeof note.createdBy === "object"
                  ? note.createdBy.name
                  : note.createdBy || "System User";
              return (
                <div key={note._id} className="p-4 rounded-xl border border-border/70 bg-muted/5 space-y-2">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {note.text}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground font-semibold">
                    <span className="flex items-center gap-1">
                      <User size={10} />
                      Created by: <span className="text-foreground/80">{creatorName}</span>
                    </span>
                    <span>{displayDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            No notes recorded for this customer yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
