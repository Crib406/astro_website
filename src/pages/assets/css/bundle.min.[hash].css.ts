import type { APIRoute, GetStaticPaths } from 'astro';
import { getCssBundle } from '../../../lib/bundles';

export const getStaticPaths = (async () => {
  const { hash } = await getCssBundle();
  return [{ params: { hash } }];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async () => {
  const { content } = await getCssBundle();
  return new Response(content, { headers: { 'Content-Type': 'text/css; charset=utf-8' } });
};
