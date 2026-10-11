// Each category owns one pile. All NAME cards share the same pile.
class DrawPile {
  constructor(values) {
    // Ignore blanks and duplicate entries from the spreadsheet.
    const cleaned = values.map(value => String(value).trim()).filter(Boolean);
    this.values = [...new Set(cleaned)];
    this.reset();
  }

  reset() {
    this.remaining = [...this.values];
  }

  draw() {
    if (this.remaining.length === 0) return null;
    const index = Math.floor(Math.random() * this.remaining.length);
    // Remove the chosen value so it cannot be drawn a second time.
    return this.remaining.splice(index, 1)[0];
  }
}
