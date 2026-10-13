import Link from 'next/link';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui';

export default function NotFound() {
  return (
    <main className='flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:px-6 lg:px-8'>
      <Card className='w-full max-w-lg text-center'>
        <CardHeader>
          <CardTitle>Página no encontrada</CardTitle>
          <CardDescription>
            La ruta que intentaste abrir no existe o fue removida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size='lg'>
            <Link href='/'>Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
