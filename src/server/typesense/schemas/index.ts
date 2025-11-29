import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import { videosV1 } from "./videos";

export const schemas: Array<CollectionCreateSchema> = [videosV1];
