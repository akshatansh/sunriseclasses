import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const SITE_NAME = 'Sunrise Classes & Academy';
const BASE_URL = 'https://sunriseclasses.com';
const DEFAULT_IMAGE = '/sunrise-logo.png';
const DEFAULT_DESCRIPTION = 'Join Sunrise Classes & Academy in Champanagar, Purnia, Bihar for expert Class 9 and 10 board exam coaching with personalized support, quality notes, and proven success stories.';
const DEFAULT_KEYWORDS = 'Sunrise Classes, coaching Purnia, Class 9 coaching, Class 10 coaching, board exam preparation, Champanagar coaching, Bihar coaching, success stories, student toppers';
const DEFAULT_AUTHOR = 'Sunrise Classes & Academy';

function updateMetaTag(attribute: 'name' | 'property', key: string, value: string) {
  const selector = `${attribute}='${key}'`;
  let element = document.head.querySelector(`meta[${selector}]`) as HTMLMetaElement | null;

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute('content', value);
}

function updateLinkRel(rel: string, href: string) {
  let element = document.head.querySelector(`link[rel='${rel}']`) as HTMLLinkElement | null;

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);
}

interface SeoProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
}

export default function Seo({ title, description, keywords, image, url }: SeoProps) {
  const location = useLocation();
  const pageUrl = `${BASE_URL}${url || location.pathname}`;

  useEffect(() => {
    document.title = `${title} | ${SITE_NAME}`;

    updateMetaTag('name', 'description', description || DEFAULT_DESCRIPTION);
    updateMetaTag('name', 'keywords', keywords || DEFAULT_KEYWORDS);
    updateMetaTag('name', 'author', DEFAULT_AUTHOR);
    updateMetaTag('name', 'robots', 'index, follow');

    updateMetaTag('property', 'og:title', `${title} | ${SITE_NAME}`);
    updateMetaTag('property', 'og:description', description || DEFAULT_DESCRIPTION);
    updateMetaTag('property', 'og:image', image || DEFAULT_IMAGE);
    updateMetaTag('property', 'og:url', pageUrl);
    updateMetaTag('property', 'og:type', 'website');
    updateMetaTag('property', 'og:site_name', SITE_NAME);

    updateMetaTag('name', 'twitter:card', 'summary_large_image');
    updateMetaTag('name', 'twitter:title', `${title} | ${SITE_NAME}`);
    updateMetaTag('name', 'twitter:description', description || DEFAULT_DESCRIPTION);
    updateMetaTag('name', 'twitter:image', image || DEFAULT_IMAGE);

    updateLinkRel('canonical', pageUrl);
  }, [title, description, keywords, image, pageUrl]);

  return null;
}
