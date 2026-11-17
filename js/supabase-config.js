/**
 * 호박(Hobak) Supabase 클라이언트 공개 설정
 * - 주의: 브라우저 공개 환경에서는 anon public key만 사용하며,
 *   SUPABASE_SERVICE_ROLE_KEY는 절대 프론트엔드 파일에 포함하지 않습니다.
 */
(function (global) {
  'use strict';

  global.HOBAK_SUPABASE_CONFIG = {
    projectId: 'ruswlhyexyoapimnishj',
    url: 'https://ruswlhyexyoapimnishj.supabase.co',
    anonKey:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1c3dsaHlleHlvYXBpbW5pc2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MjgzNTEsImV4cCI6MjExMDQwNDM1MX0.fXkqsIPxtw84A_9FxFopnW95i-ftDtLk-7S9hXjG4iA',
    table: 'hobak_items',
    tables: {
      items: 'hobak_items',
      likes: 'item_likes',
      chats: 'item_chat_messages'
    },
    enabled: true
  };
})(window);
