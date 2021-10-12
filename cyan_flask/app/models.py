import os
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import expression
from sqlalchemy.dialects.mysql import MEDIUMTEXT, LONGTEXT
from flask_migrate import Migrate

import utils


db = SQLAlchemy()
migrate = Migrate()


class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, nullable=False, primary_key=True)
    username = db.Column(db.String(35), nullable=False, unique=True)
    email = db.Column(db.String(50), nullable=False, unique=True)
    password = db.Column(db.String(256), nullable=False)
    created = db.Column(db.DateTime, nullable=False)
    last_visit = db.Column(db.DateTime, nullable=False)


class Location(db.Model):
    __tablename__ = "location"
    owner = db.Column(db.String(35), nullable=False, primary_key=True)
    id = db.Column(db.Integer, nullable=False, primary_key=True)
    name = db.Column(db.String(256), nullable=False)
    latitude = db.Column(db.Numeric(12, 10), nullable=False)
    longitude = db.Column(db.Numeric(13, 10), nullable=False)
    marked = db.Column(db.Boolean, nullable=False, server_default=expression.false())
    notes = db.Column(db.Text, nullable=False)
    compare = db.Column(db.Boolean, nullable=False, server_default=expression.false())

    @staticmethod
    def validate_id(location_id):
        """
        Validation on location parameters before committing to DB.
        """
        try:
            location_id = int(location_id)
        except ValueError as e:
            return False
        if not isinstance(location_id, int):
            return False
        if location_id < 1:
            return False

        return location_id


class Notifications(db.Model):
    __tablename__ = "notifications"
    owner = db.Column(db.String(35), nullable=False, primary_key=True)
    id = db.Column(db.Integer, nullable=False, primary_key=True)
    date = db.Column(db.DateTime, nullable=False)
    subject = db.Column(db.String(256), nullable=False)
    body = db.Column(db.Text, nullable=False)
    is_new = db.Column(db.Boolean, nullable=False)


class Settings(db.Model):
    __tablename__ = "settings"
    user_id = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=False, primary_key=True
    )
    level_low = db.Column(db.Integer, nullable=False)
    level_medium = db.Column(db.Integer, nullable=False)
    level_high = db.Column(db.Integer, nullable=False)
    enable_alert = db.Column(db.Boolean, nullable=False)
    alert_value = db.Column(db.Integer)


class Comment(db.Model):
    __tablename__ = "comment"
    id = db.Column(db.Integer, nullable=False, primary_key=True)
    title = db.Column(db.String(128), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    username = db.Column(db.String(32), nullable=False)
    device = db.Column(db.String(64), nullable=False, server_default="N/A")
    browser = db.Column(db.String(64), nullable=False, server_default="N/A")
    comment_text = db.Column(db.String(2000), nullable=False)
    comment_images = db.relationship("CommentImages", backref="comment_body", lazy=True)
    replies = db.relationship("Reply", backref="comment", lazy=True)


class CommentImages(db.Model):
    __tablename__ = "comment_images"
    id = db.Column(db.Integer, nullable=False, primary_key=True)
    comment_id = db.Column(db.Integer, db.ForeignKey("comment.id"), nullable=False)
    comment_image = db.Column(db.String(256), nullable=False)  # path to image source


class Reply(db.Model):
    __tablename__ = "comment_reply"
    id = db.Column(db.Integer, nullable=False, primary_key=True)
    comment_id = db.Column(db.Integer, db.ForeignKey("comment.id"), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    username = db.Column(db.String(32), nullable=False)
    body = db.Column(db.String(500), nullable=False)


class Job(db.Model):
    __tablename__ = "job"
    id = db.Column(db.Integer, nullable=False, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    job_num = db.Column(db.Integer, nullable=False)
    job_id = db.Column(db.String(256), nullable=False)  # batch job ID
    job_status = db.Column(db.String(32), nullable=False)  # batch job status
    input_file = db.Column(db.String(128), nullable=False)  # user input filename
    output_file = db.Column(db.String(128), nullable=False)  # user output filename
    num_locations = db.Column(db.Integer, nullable=False)  # of locations in job
    received_datetime = db.Column(
        db.DateTime, nullable=False
    )  # init time job was received
    started_datetime = db.Column(db.DateTime, nullable=True)  # time job is started
    finished_datetime = db.Column(db.DateTime, nullable=True)  # time job is complete
    queue_time = db.Column(db.Integer, nullable=True)  # time spent waiting in queue
    exec_time = db.Column(db.Integer, nullable=True)  # execution time

    @staticmethod
    def job_response():
        return {"status": None, "job_id": None, "job_status": None}

    @staticmethod
    def job_response_obj():
        return {
            "jobNum": None,
            "jobId": None,
            "jobStatus": None,
            "inputFile": None,
            "numLocations": None,
            "receivedDatetime": None,
            "startedDatetime": None,
            "finishedDatetime": None,
        }

    @staticmethod
    def user_jobs_response():
        return {"status": None, "jobs": []}

    @classmethod
    def create_jobs_json(cls, user_jobs):
        """
        Creates json object of user jobs for frontend table.
        """
        jobs_json = []
        for job in user_jobs:
            job_obj = dict(cls.job_response_obj())
            job_obj["jobNum"] = job.job_num
            job_obj["jobId"] = job.job_id
            job_obj["jobStatus"] = job.job_status
            job_obj["inputFile"] = job.input_file
            job_obj["numLocations"] = job.num_locations
            job_obj["receivedDatetime"] = utils.get_datetime_string(
                job.received_datetime
            )
            job_obj["startedDatetime"] = utils.get_datetime_string(job.started_datetime)
            job_obj["finishedDatetime"] = utils.get_datetime_string(
                job.finished_datetime
            )
            jobs_json.append(job_obj)
        return jobs_json


class Report(db.Model):
    __tablename__ = "report"
    id = db.Column(db.Integer, nullable=False, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    report_num = db.Column(db.Integer, nullable=False)
    report_id = db.Column(db.String(256), nullable=False)  # report ID
    report_status = db.Column(db.String(32), nullable=False)  # report status
    report_file = db.Column(db.String(128), nullable=False)  # report filename
    report_date = db.Column(db.String(10), nullable=False)  # date report is for (format ex: "2020 299")
    report_objectids = db.Column(db.Text, nullable=False)  # objectids for report (format: "123456, 789123, 456789")
    report_tribes = db.Column(db.Text, nullable=False)  # tribes for report (TODO)
    report_counties = db.Column(db.Text, nullable=False)  # counties for report (TODO)
    report_ranges = db.Column(db.String(256), nullable=False)  # user set ranges for report  (TODO)
    received_datetime = db.Column(
        db.DateTime, nullable=False
    )  # init time report was received
    started_datetime = db.Column(db.DateTime, nullable=True)  # time report is started
    finished_datetime = db.Column(db.DateTime, nullable=True)  # time report is complete
    queue_time = db.Column(db.Integer, nullable=True)  # time spent waiting in queue
    exec_time = db.Column(db.Integer, nullable=True)  # execution time

    @staticmethod
    def report_response():
        return {"status": None, "report_id": None, "report_status": None}

    @staticmethod
    def report_response_obj():
        return {
            "report_num": None,
            "report_id": None,
            "report_status": None,
            "report_file": None,
            "report_date": None,
            "report_objectids": None,
            "report_tribes": None,
            "report_counties": None,
            "report_ranges": None,
            "received_datetime": None,
            "started_datetime": None,
            "finished_datetime": None,
            "queue_time": None,
            "exec_time": None,
        }

    @staticmethod
    def user_reports_response():
        return {"status": None, "reports": []}

    @classmethod
    def create_reports_json(cls, user_reports):
        """
        Creates json object of user reports for frontend table.
        """
        reports_json = []
        for report in user_reports:
            report_obj = dict(cls.report_response_obj())

            report_obj["report_num"] = report.report_num
            report_obj["report_id"] = report.report_id
            report_obj["report_status"] = report.report_status
            report_obj["report_file"] = report.report_file
            report_obj["report_date"] = report.report_date
            report_obj["report_objectids"] = report.report_objectids
            report_obj["report_tribes"] = report.report_tribes
            report_obj["report_counties"] = report.report_counties
            report_obj["report_ranges"] = report.report_ranges
            report_obj["received_datetime"] = report.received_datetime
            report_obj["started_datetime"] = report.started_datetime
            report_obj["finished_datetime"] = report.finished_datetime
            report_obj["queue_time"] = report.queue_time
            report_obj["exec_time"] = report.exec_time


            report_obj["reportNum"] = report.report_num
            report_obj["reportId"] = report.report_id
            report_obj["reportStatus"] = report.report_status
            report_obj["inputFile"] = report.input_file
            report_obj["numLocations"] = report.num_locations
            report_obj["receivedDatetime"] = utils.get_datetime_string(
                report.received_datetime
            )
            report_obj["startedDatetime"] = utils.get_datetime_string(report.started_datetime)
            report_obj["finishedDatetime"] = utils.get_datetime_string(
                report.finished_datetime
            )
            reports_json.append(report_obj)
        return reports_json
