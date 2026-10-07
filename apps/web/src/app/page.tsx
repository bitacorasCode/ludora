import Link from 'next/link';

import { PageContainer, PageSection } from '@/components/layout/page-layout';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BodyText, SubsectionTitle } from '@/components/typography/typography';
import { PageHeading, SectionHeading } from '@/components/typography/heading';

export default function Home() {
  return (
    <PageContainer>
      <Card variant='hero'>
        <CardHeader>
          <PageHeading
            eyebrow='La plataforma para tus juegos'
            title='Una mesa para todos tus mundos.'
            description='Descubre juegos, reúne a tus amigos y comparte nuevas partidas desde un solo lugar.'
          />
        </CardHeader>

        <CardFooter>
          <Button asChild size='lg'>
            <Link href='#catalogo'>Explorar Ludora</Link>
          </Button>
        </CardFooter>
      </Card>

      <PageSection id='catalogo' aria-labelledby='catalogo-titulo'>
        <SectionHeading
          eyebrow='Catálogo'
          title='Juegos para cada mesa'
          titleId='catalogo-titulo'
        />

        <Card variant='empty'>
          <CardHeader>
            <SubsectionTitle>Estamos preparando el catálogo</SubsectionTitle>
            <BodyText>
              Pronto encontrarás aquí los juegos disponibles en Ludora.
            </BodyText>
          </CardHeader>
        </Card>
      </PageSection>

      <PageSection id='ranking' aria-labelledby='ranking-titulo' separated>
        <SectionHeading
          eyebrow='Comunidad'
          title='Ranking'
          titleId='ranking-titulo'
        />
        <Card variant='hero'>
          <CardHeader>
            <BodyText>
              Las clasificaciones aparecerán cuando haya partidas para
              compartir.
            </BodyText>
          </CardHeader>
        </Card>
      </PageSection>
    </PageContainer>
  );
}
