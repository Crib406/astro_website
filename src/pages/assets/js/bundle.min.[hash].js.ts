import type { APIRoute, GetStaticPaths } from 'astro';
import { getJsBundle } from '../../../lib/bundles';

export const getStaticPaths = (async () => {
  const { hash } = await getJsBundle();
  return [{ params: { hash } }];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async () => {
  const { content } = await getJsBundle();
  return new Response(content, { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } });
};
