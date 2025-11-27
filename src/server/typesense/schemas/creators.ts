export const creatorsV1 = {
  name: "creators_v1",
  fields: [
    {
      name: "id",
      type: "string",
    },
    {
      name: "username",
      type: "string",
      facet: true,
    },
    {
      name: "display_name",
      type: "string",
      facet: true,
    },
    {
      name: "aliases",
      type: "string[]",
      facet: true,
    },
    {
      name: "birthday",
      type: "date",
      facet: true,
    },
    {
      name: "links",
      type: "string[]",
      facet: true,
    },
  ],
  default_sorting_field: "display_name",
};

export type CreatorV1 = {
  id: string;
  username: string;
  display_name: string;
  aliases: string[];
  birthday: string;
  links: string[];
};
