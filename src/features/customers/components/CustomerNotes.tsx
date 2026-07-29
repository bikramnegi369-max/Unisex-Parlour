"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface CustomerNotesProps {
  notes?: string;
}

export function CustomerNotes({ notes }: CustomerNotesProps) {
  return (
    <Card className="border border-border/80 shadow-sm animate-in fade-in duration-200">
      <CardHeader className="border-b border-border/85 bg-muted/5 py-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          Internal Staff Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {notes ? (
          <p className="text-sm text-foreground bg-muted/30 p-3 rounded-lg border border-border/60 whitespace-pre-wrap leading-relaxed">
            {notes}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            No notes recorded for this customer yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
