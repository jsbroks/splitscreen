import Image from "next/image";

export const VideoCard: React.FC = () => {
  return (
    <div>
      <div>
        <Image
          alt="Placeholder"
          className="rounded-sm"
          height={400}
          src="https://placehold.co/600x400.webp"
          width={600}
        />
      </div>
      <h2 className="hover:text-primary">Title</h2>
    </div>
  );
};
