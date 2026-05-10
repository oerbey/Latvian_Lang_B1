function assertText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing ${label}.`);
  }
  return value.trim();
}

export function normalizeSimilarWordData(payload) {
  if (!payload || !Array.isArray(payload.groups)) {
    throw new Error('Similar word payload must include groups.');
  }

  return payload.groups.map((group, groupIndex) => {
    const groupId = assertText(group.id ?? `group-${groupIndex + 1}`, 'group id');
    const entries = Array.isArray(group.entries) ? group.entries : [];
    if (entries.length < 2) {
      throw new Error(`Group ${groupId} must include at least two entries.`);
    }

    const normalizedEntries = entries.map((entry, entryIndex) => {
      const id = assertText(entry.id ?? `${groupId}-${entryIndex + 1}`, 'entry id');
      const word = assertText(entry.word, `word for ${id}`);
      const sentenceLv = assertText(entry.sentence_lv, `sentence for ${id}`);
      if (!sentenceLv.includes('___')) {
        throw new Error(`Sentence for ${id} must include a blank marker.`);
      }

      return {
        id,
        word,
        meaningEn: assertText(entry.meaning_en, `meaning for ${id}`),
        sentenceLv,
        explanationEn: assertText(entry.explanation_en, `explanation for ${id}`),
        tags: Array.isArray(entry.tags) ? entry.tags.filter(Boolean) : [],
      };
    });

    return {
      id: groupId,
      title: assertText(group.title, `title for ${groupId}`),
      focus: assertText(group.focus, `focus for ${groupId}`),
      entries: normalizedEntries,
    };
  });
}

export function buildTasks(groups) {
  return groups.flatMap((group) => {
    const choices = group.entries.map((entry) => entry.word);
    return group.entries.map((entry) => ({
      id: entry.id,
      groupId: group.id,
      groupTitle: group.title,
      groupFocus: group.focus,
      answer: entry.word,
      meaningEn: entry.meaningEn,
      sentenceLv: entry.sentenceLv,
      explanationEn: entry.explanationEn,
      tags: entry.tags,
      choices,
    }));
  });
}

export function fillBlank(sentence, word) {
  return sentence.replace('___', word);
}

export function isCorrectChoice(choice, task) {
  return choice === task.answer;
}
