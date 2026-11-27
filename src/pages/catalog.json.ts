import type { APIRoute } from "astro";
import { getPhotos } from "../data/photos";

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ photos: await getPhotos() }), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
