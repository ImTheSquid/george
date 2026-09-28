-- Comments point at their subject polymorphically (no FK), so deletes cascade through triggers.
-- Replies chain through the comment trigger, which needs PRAGMA recursive_triggers = ON.
WITH RECURSIVE dead(id) AS (
	SELECT id FROM comment c WHERE
		(c.subject_type = 'link' AND c.subject_id NOT IN (SELECT id FROM link))
		OR (c.subject_type = 'highlight' AND c.subject_id NOT IN (SELECT id FROM highlight))
		OR (c.subject_type = 'comment' AND c.subject_id NOT IN (SELECT id FROM comment))
	UNION
	SELECT c.id FROM comment c JOIN dead d ON c.subject_type = 'comment' AND c.subject_id = d.id
)
DELETE FROM comment WHERE id IN (SELECT id FROM dead);
--> statement-breakpoint
CREATE TRIGGER link_delete_comments AFTER DELETE ON link BEGIN
	DELETE FROM comment WHERE subject_type = 'link' AND subject_id = OLD.id;
END;
--> statement-breakpoint
CREATE TRIGGER highlight_delete_comments AFTER DELETE ON highlight BEGIN
	DELETE FROM comment WHERE subject_type = 'highlight' AND subject_id = OLD.id;
END;
--> statement-breakpoint
CREATE TRIGGER comment_delete_replies AFTER DELETE ON comment BEGIN
	DELETE FROM comment WHERE subject_type = 'comment' AND subject_id = OLD.id;
END;
