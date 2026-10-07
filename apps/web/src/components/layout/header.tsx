import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const links = [
  { href: '/#catalogo', label: 'Juegos' },
  { href: '/#ranking', label: 'Ranking' },
];

export function Header() {
  return (
    <header className='sticky top-0 z-40 border-b bg-background/90 backdrop-blur'>
      <nav
        aria-label='Navegación principal'
        className='mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'
      >
        <Link href='/' className='flex items-center gap-2 font-semibold'>
          <span
            aria-hidden='true'
            className='grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground'
          >
            L
          </span>
          <span>Ludora</span>
        </Link>

        <div className='hidden items-center gap-6 md:flex'>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className='text-sm text-muted-foreground transition-colors hover:text-foreground'
            >
              {link.label}
            </Link>
          ))}
        </div>

        <Button asChild className='hidden md:inline-flex'>
          <Link href='/#catalogo'>Explorar catálogo</Link>
        </Button>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant='outline' size='sm' className='md:hidden'>
              Menú
            </Button>
          </SheetTrigger>

          <SheetContent side='right'>
            <SheetHeader>
              <SheetTitle>Menú de Ludora</SheetTitle>
              <SheetDescription>
                Accede a las secciones de la plataforma.
              </SheetDescription>
            </SheetHeader>

            <nav
              aria-label='Navegación móvil'
              className='flex flex-col gap-4 px-6'
            >
              {links.map((link) => (
                <SheetClose asChild key={link.href}>
                  <Link href={link.href} className='text-base font-medium'>
                    {link.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
