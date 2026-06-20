import React from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FeatureItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export interface VideoData {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  duration: string;
  formats: VideoFormat[];
}

export interface VideoFormat {
  label: string;
  ext: string;
  size: string;
  quality: string;
  hasAudio: boolean;
}

export interface SEOInsight {
  optimizedTitle: string;
  tags: string[];
  description: string;
  seoScore: number;
  viralPotential: 'Low' | 'Medium' | 'High';
  trendingScore: number;
  category: string;
  suggestedKeywords: string[];
  bestHashtags: string[];
  contentSummary: string;
  titleAnalysis: string;
  uploadDate: string;
}