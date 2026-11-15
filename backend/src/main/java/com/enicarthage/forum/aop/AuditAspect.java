/*importations*/
package com.enicarthage.forum.aop;



import com.enicarthage.forum.model.AuditLog;
import com.enicarthage.forum.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;

@Aspect
@Component
@Log4j2
@RequiredArgsConstructor
public class AuditAspect {

    private final AuditLogRepository auditLogRepository;

    @AfterReturning(
        pointcut = "execution(* com.enicarthage.forum.service.CandidatureCVService.accepter(..)) || " +
                   "execution(* com.enicarthage.forum.service.CandidatureCVService.refuser(..)) || " +
                   "execution(* com.enicarthage.forum.service.TacheService.changerStatut(..))",
        returning = "result")
    public void audit(JoinPoint jp, Object result) {
        String user = "anonyme";
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) user = auth.getName();
        } catch (Exception ignored) {}

        AuditLog auditLog = AuditLog.builder()
                .action(jp.getSignature().getName())
                .details(resume(jp, result))
                .dateAction(LocalDateTime.now())
                .utilisateur(user)
                .build();
        auditLogRepository.save(auditLog);
        log.info("Audit : {} par {}", jp.getSignature().getName(), user);
    }

    // Résumé court (l'objet complet est trop long et contient des relations)
    private String resume(JoinPoint jp, Object result) {
        Object[] args = jp.getArgs();
        String id = args.length > 0 ? String.valueOf(args[0]) : "?";
        String detail = "id=" + id;
        if (result instanceof com.enicarthage.forum.model.CandidatureCV c) detail += ", statut=" + c.getStatut();
        if (result instanceof com.enicarthage.forum.model.Tache t) detail += ", statut=" + t.getStatut();
        return detail.length() > 250 ? detail.substring(0, 250) : detail;
    }
}
