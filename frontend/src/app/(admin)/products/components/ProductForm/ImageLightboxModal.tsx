import { Modal } from "@/components/ui/modal";

type Props = {
  image: { src: string; alt: string } | null;
  onClose: () => void;
};

export function ImageLightboxModal({ image, onClose }: Props) {
  return (
    <Modal
      isOpen={image !== null}
      onClose={onClose}
      className="m-4 max-h-[90vh] max-w-[min(96vw,1400px)] border-0 !bg-transparent p-0 shadow-none dark:!bg-transparent"
    >
      {image ? (
        <div className="flex max-h-[85vh] items-center justify-center px-2 pb-10 pt-2 sm:px-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- object URL or backend URL */}
          <img
            src={image.src}
            alt={image.alt}
            className="max-h-[85vh] max-w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
    </Modal>
  );
}
