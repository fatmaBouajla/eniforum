package com.enicarthage.forum.util;

import java.text.Normalizer;

/** Petites aides pour comparer des textes saisis par les utilisateurs. */
public final class Textes {

    private Textes() {}

    /** "Comité Média" -> "media" : sans accents, sans le mot « comité », en minuscules. */
    public static String cleComite(String nom) {
        if (nom == null) return "";
        String s = Normalizer.normalize(nom, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        s = s.toLowerCase().replaceAll("\\bcomite\\b", " ");
        return s.replaceAll("[^a-z0-9]+", " ").trim();
    }

    /** Vrai si deux noms désignent le même comité. */
    public static boolean memeComite(String a, String b) {
        String x = cleComite(a), y = cleComite(b);
        return !x.isEmpty() && !y.isEmpty() && (x.equals(y) || x.contains(y) || y.contains(x));
    }
}
