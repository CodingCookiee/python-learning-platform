"use client";

import * as React from "react";

/** The lesson's scratchpad (split view), when the page has one: code blocks can send examples to it */
export interface Scratchpad {
  load: (code: string) => void;
  /** The pane is showing, so the lesson has less width (its side table of contents folds away) */
  open: boolean;
}

export const ScratchpadContext = React.createContext<Scratchpad | null>(null);
