package com.enicarthage.forum.repository;
import com.enicarthage.forum.model.CandidatureCV;
import com.enicarthage.forum.model.StatutCandidature;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CandidatureCVRepository extends JpaRepository<CandidatureCV, Long> {
    boolean existsByCandidatEmailAndStatut(String candidatEmail, StatutCandidature statut);
    List<CandidatureCV> findByStatutOrderByScoreIADesc(StatutCandidature statut);
}