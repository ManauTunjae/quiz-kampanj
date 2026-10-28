-- QuizBloom – fejkdata för test
-- Kör EFTER schema.sql, på samma sätt i SQL Editor.
-- Alla namn och e-postadresser är påhittade (@example.com).
-- Filen kan köras flera gånger: den raderar först den gamla demo-kampanjen.

delete from campaigns where slug = 'demo-hostquiz';

do $$
declare
  c_id uuid;
  q1 uuid; q2 uuid; q3 uuid; q4 uuid;
  -- rätta alternativ
  o1_ok uuid; o2_ok uuid; o3_ok uuid; o4_ok uuid;
  -- felaktiga alternativ (ett per fråga räcker för fejkdatan)
  o1_bad uuid; o2_bad uuid; o3_bad uuid; o4_bad uuid;
  s_id uuid;
  i int;
  names text[] := array['Alva Test','Bo Exempel','Cleo Fejk','Dan Demo','Elsa Prov'];
begin
  insert into campaigns (slug, title, accent_color)
  values ('demo-hostquiz', 'Höstquiz: Hur väl känner du naturen?', '#E3B6B1')
  returning id into c_id;

  -- Fråga 1
  insert into questions (campaign_id, position, text)
  values (c_id, 1, 'Vilken årstid är det när löven faller?') returning id into q1;
  insert into options (question_id, position, text, is_correct) values
    (q1, 1, 'Våren', false),
    (q1, 2, 'Hösten', true),
    (q1, 3, 'Sommaren', false);

  -- Fråga 2
  insert into questions (campaign_id, position, text)
  values (c_id, 2, 'Vilket djur går i ide på vintern?') returning id into q2;
  insert into options (question_id, position, text, is_correct) values
    (q2, 1, 'Björnen', true),
    (q2, 2, 'Räven', false),
    (q2, 3, 'Haren', false);

  -- Fråga 3
  insert into questions (campaign_id, position, text)
  values (c_id, 3, 'Vad kallas en skog med bara barrträd?') returning id into q3;
  insert into options (question_id, position, text, is_correct) values
    (q3, 1, 'Lövskog', false),
    (q3, 2, 'Barrskog', true),
    (q3, 3, 'Regnskog', false);

  -- Fråga 4
  insert into questions (campaign_id, position, text)
  values (c_id, 4, 'Vilken svamp är en av Sveriges mest populära matsvampar?') returning id into q4;
  insert into options (question_id, position, text, is_correct) values
    (q4, 1, 'Flugsvamp', false),
    (q4, 2, 'Kantarell', true),
    (q4, 3, 'Spindelskivling', false);

  -- Hämta id för ett rätt och ett fel alternativ per fråga
  select id into o1_ok  from options where question_id = q1 and is_correct;
  select id into o1_bad from options where question_id = q1 and not is_correct order by position limit 1;
  select id into o2_ok  from options where question_id = q2 and is_correct;
  select id into o2_bad from options where question_id = q2 and not is_correct order by position limit 1;
  select id into o3_ok  from options where question_id = q3 and is_correct;
  select id into o3_bad from options where question_id = q3 and not is_correct order by position limit 1;
  select id into o4_ok  from options where question_id = q4 and is_correct;
  select id into o4_bad from options where question_id = q4 and not is_correct order by position limit 1;

  -- 5 fejkdeltagare. Deltagare i = 1..5 får i-1 fel svar (0..4 fel).
  for i in 1..5 loop
    insert into submissions (campaign_id, score, total)
    values (c_id, 5 - i, 4)  -- poäng 4,3,2,1,0 av 4
    returning id into s_id;

    insert into answers (submission_id, question_id, option_id) values
      (s_id, q1, case when i <= 4 then o1_ok else o1_bad end),
      (s_id, q2, case when i <= 3 then o2_ok else o2_bad end),
      (s_id, q3, case when i <= 2 then o3_ok else o3_bad end),
      (s_id, q4, case when i <= 1 then o4_ok else o4_bad end);

    -- De tre första deltagarna lämnar en lead
    if i <= 3 then
      insert into leads (submission_id, name, email, consent, consent_text)
      values (
        s_id,
        names[i],
        'fejk' || i || '@example.com',
        true,
        'Jag godkänner att QuizBloom sparar mitt namn och min e-postadress (testdata).'
      );
    end if;
  end loop;
end $$;
