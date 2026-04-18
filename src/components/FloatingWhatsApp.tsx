const WHATSAPP_NUMBER = '919973152070';
const WHATSAPP_MESSAGE = encodeURIComponent(
  'Hello Sunrise Classes, I want to know more about admission and classes.'
);

export default function FloatingWhatsApp() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message Sunrise Classes on WhatsApp"
      className="fixed bottom-5 right-5 z-50 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-[#25D366] text-white shadow-xl shadow-green-600/30 flex items-center justify-center hover:bg-[#1fb85a] hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-green-300"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 32 32"
        className="h-8 w-8 sm:h-9 sm:w-9"
        fill="currentColor"
      >
        <path d="M16.03 3.2c-6.96 0-12.62 5.64-12.62 12.58 0 2.32.64 4.58 1.86 6.55L3.3 29.5l7.36-1.93a12.55 12.55 0 0 0 5.36 1.2h.01c6.96 0 12.62-5.64 12.62-12.58A12.56 12.56 0 0 0 16.03 3.2Zm0 23.44h-.01c-1.73 0-3.42-.46-4.9-1.33l-.35-.2-4.37 1.14 1.17-4.25-.23-.37a10.42 10.42 0 0 1-1.6-5.54c0-5.76 4.7-10.45 10.48-10.45 2.8 0 5.43 1.09 7.4 3.06a10.36 10.36 0 0 1 3.07 7.39c0 5.76-4.7 10.45-10.46 10.45Zm5.73-7.82c-.31-.16-1.86-.92-2.15-1.02-.29-.11-.5-.16-.71.16-.21.31-.82 1.02-1 1.23-.19.21-.37.23-.69.08-.31-.16-1.33-.49-2.54-1.56-.94-.83-1.57-1.86-1.75-2.17-.18-.31-.02-.48.14-.64.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54h-.61c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.63 0 1.55 1.13 3.05 1.29 3.26.16.21 2.23 3.4 5.4 4.77.75.32 1.34.52 1.8.66.76.24 1.45.21 1.99.13.61-.09 1.86-.76 2.13-1.49.26-.73.26-1.36.18-1.49-.08-.13-.29-.21-.61-.37Z" />
      </svg>
    </a>
  );
}
