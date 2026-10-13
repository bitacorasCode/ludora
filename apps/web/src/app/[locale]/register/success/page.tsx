import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export default async function SuccessPage() {
  const cookieStore = await cookies();

  const successCookie = cookieStore.get('registration-success');

  if (!successCookie) {
    redirect('/register');
  }

  return (
    <div className='w-full flex justify-center p-8'>
      <Card className='w-1/2'>
        <CardHeader>
          <CardTitle>Registro exitoso</CardTitle>
          <CardDescription>
            Su registro ha sido completado correctamente.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
