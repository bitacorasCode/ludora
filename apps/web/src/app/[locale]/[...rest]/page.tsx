import { notFound } from 'next/navigation';

// This route always renders the 404 boundary instead of page content.
export const instant = false;

export default function CatchAllPage() {
  notFound();
}
